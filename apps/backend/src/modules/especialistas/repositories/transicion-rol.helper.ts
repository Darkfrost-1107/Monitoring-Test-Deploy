import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { CreateEspecialistaDto } from '../dto/create-especialista.dto.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import { CondicionLaboral } from '../../../common/enums/condicion-laboral.enum.js';
import { mapEspecialista } from './especialista-mapper.helper.js';

export async function transicionDocenteAEspecialista(
  prisma: PrismaService,
  personaId: string,
  dto: CreateEspecialistaDto,
  rolEspecialistaId: string,
) {
  return prisma.$transaction(async (tx) => {
    if (dto.cargo === 'Jefe de Área') {
      const existingJefe = await tx.especialista.findFirst({
        where: {
          nivelEducativo: dto.nivelEducativo,
          cargo: 'Jefe de Área',
          estado: EstadoRegistro.ACTIVO,
          personaId: { not: personaId },
        },
      });
      if (existingJefe) {
        throw new ConflictException(
          `Ya existe un Responsable de Nivel activo para el nivel ${dto.nivelEducativo}.`,
        );
      }
    }

    // 1. Verificar Docente activo
    const docente = await tx.docente.findUnique({
      where: { personaId },
    });

    if (docente && docente.estado === (EstadoRegistro.ACTIVO as string)) {
      // 2. Inactivar Docente
      await tx.docente.update({
        where: { id: docente.id },
        data: { estado: EstadoRegistro.INACTIVO },
      });

      // 3. Cerrar Cargos de Docente
      await tx.docenteCargo.updateMany({
        where: { docenteId: docente.id, fechaFin: null },
        data: { fechaFin: new Date() },
      });
    }

    // 4. Crear o Reactivar Especialista
    let especialista = await tx.especialista.findUnique({
      where: { personaId },
    });

    if (especialista) {
      // Reactivar
      especialista = await tx.especialista.update({
        where: { id: especialista.id },
        data: {
          estado: EstadoRegistro.ACTIVO,
          cargo: dto.cargo,
          nivelEducativo: dto.nivelEducativo,
        },
      });

      // Cerrar cargos anteriores
      await tx.especialistaCargo.updateMany({
        where: { especialistaId: especialista.id, fechaFin: null },
        data: { fechaFin: new Date() },
      });

      // Crear nuevo cargo
      await tx.especialistaCargo.create({
        data: {
          especialistaId: especialista.id,
          cargo: dto.cargo,
          fechaInicio: new Date(),
        },
      });
    } else {
      // Crear Especialista
      especialista = await tx.especialista.create({
        data: {
          personaId,
          cargo: dto.cargo,
          condicionLaboral: dto.condicionLaboral || CondicionLaboral.NOMBRADO,
          cargaLaboral: dto.cargaLaboral ?? 40,
          escalaMagisterial: dto.escalaMagisterial ?? null,
          nivelEducativo: dto.nivelEducativo,
          estado: EstadoRegistro.ACTIVO,
          cargos: {
            create: {
              cargo: dto.cargo,
              fechaInicio: new Date(),
            },
          },
        },
      });
    }

    // Actualizar especialidades
    if (dto.especialidad) {
      await tx.especialistaEspecialidad.deleteMany({
        where: { especialistaId: especialista.id },
      });
      await tx.especialistaEspecialidad.create({
        data: {
          especialistaId: especialista.id,
          especialidadId: dto.especialidad,
        },
      });
    }

    // Actualizar Datos de Persona
    await tx.persona.update({
      where: { id: personaId },
      data: {
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        correo: dto.correo,
        telefono: dto.telefono,
      },
    });

    // 5. Cambiar Rol
    await tx.usuario.updateMany({
      where: { personaId },
      data: { rolId: rolEspecialistaId, isActive: true },
    });

    const fullEspecialista = await tx.especialista.findUniqueOrThrow({
      where: { id: especialista.id },
      include: {
        persona: {
          include: {
            usuario: { include: { rol: true } },
          },
        },
        especialidades: { include: { especialidad: true } },
        cargos: true,
      },
    });

    return mapEspecialista(fullEspecialista);
  });
}
