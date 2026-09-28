import { randomUUID } from 'node:crypto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type {
  IEspecialistaResponse,
  IUpdateEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import { mapEspecialista, ESPECIALISTA_INCLUDE } from './especialista-mapper.helper.js';

export async function update(
  prisma: PrismaService,
  id: string,
  data: IUpdateEspecialistaRequest,
  roleId?: string,
): Promise<IEspecialistaResponse> {
  const esp = await prisma.especialista.findUnique({
    where: { id },
    include: {
      especialidades: {
        include: { especialidad: true },
      },
      cargos: { where: { fechaFin: null } },
    },
  });
  if (!esp) {
    throw new NotFoundException(`Especialista con ID ${id} no encontrado.`);
  }

  const cargoActivoActual = esp.cargos[0]?.cargo ?? CargoNombre.ESPECIALISTA;
  const cargoCambio = data.cargo && data.cargo !== cargoActivoActual;

  return await prisma.$transaction(async (tx) => {
    const targetNivel = data.nivelEducativo || esp.nivelEducativo;
    const targetCargo = data.cargo || cargoActivoActual;
    const targetEstado = data.estado || esp.estado;

    if (
      targetCargo === (CargoNombre.JEFE_AREA as string) &&
      targetEstado === (EstadoRegistro.ACTIVO as string)
    ) {
      const existingJefe = await tx.especialista.findFirst({
        where: {
          nivelEducativo: targetNivel,
          cargo: CargoNombre.JEFE_AREA,
          estado: EstadoRegistro.ACTIVO,
          id: { not: id },
        },
      });
      if (existingJefe) {
        throw new ConflictException(
          `Ya existe un Responsable de Nivel activo para el nivel ${targetNivel}.`,
        );
      }
    }

    await tx.persona.update({
      where: { id: esp.personaId },
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        correo: data.correo !== undefined ? data.correo || null : undefined,
        telefono: data.telefono !== undefined ? data.telefono || null : undefined,
      },
    });

    if (roleId) {
      await tx.usuario.update({
        where: { personaId: esp.personaId },
        data: { rolId: roleId },
      });
    }

    await tx.especialista.update({
      where: { id },
      data: {
        nivelEducativo: data.nivelEducativo,
        estado: data.estado,
        ...(data.cargo && { cargo: data.cargo }),
        ...(data.condicionLaboral && { condicionLaboral: data.condicionLaboral }),
        cargaLaboral: data.cargaLaboral !== undefined ? data.cargaLaboral : undefined,
        escalaMagisterial:
          data.escalaMagisterial !== undefined ? data.escalaMagisterial : undefined,
      },
    });

    if (cargoCambio) {
      await tx.especialistaCargo.updateMany({
        where: { especialistaId: id, fechaFin: null },
        data: { fechaFin: new Date() },
      });
      if (data.cargo !== (CargoNombre.ESPECIALISTA as string)) {
        await tx.especialistaCargo.create({
          data: {
            id: randomUUID(),
            especialistaId: id,
            cargo: data.cargo,
            fechaInicio: new Date(),
            fechaFin: null,
            esPrincipal: true,
          },
        });
      }
    }

    if (
      data.especialidad !== undefined ||
      data.especialidadesExtras !== undefined ||
      data.especialidades !== undefined
    ) {
      await tx.especialistaEspecialidad.deleteMany({
        where: { especialistaId: id },
      });

      const specialtiesToCreate: { nombre: string; esPrincipal: boolean }[] = [];

      let mainSpecialty = data.especialidad;
      if (mainSpecialty === undefined) {
        const prevMain = esp.especialidades.find((e) => e.esPrincipal);
        mainSpecialty = prevMain?.especialidad?.nombre;
      }

      if (mainSpecialty) {
        specialtiesToCreate.push({ nombre: mainSpecialty.trim(), esPrincipal: true });
      }

      let extraSpecialties = data.especialidadesExtras;
      if (extraSpecialties === undefined) {
        if (data.especialidades) {
          extraSpecialties = data.especialidades.filter(
            (e: string) => e.trim() && e.trim() !== mainSpecialty,
          );
        } else {
          const prevExtras = esp.especialidades.filter((e) => !e.esPrincipal);
          extraSpecialties = prevExtras.map((e) => e.especialidad.nombre);
        }
      }

      if (extraSpecialties && extraSpecialties.length > 0) {
        for (const extra of extraSpecialties) {
          const trimmed = extra.trim();
          if (
            trimmed &&
            !specialtiesToCreate.some((s) => s.nombre.toLowerCase() === trimmed.toLowerCase())
          ) {
            specialtiesToCreate.push({ nombre: trimmed, esPrincipal: false });
          }
        }
      }

      if (
        specialtiesToCreate.length === 0 &&
        data.especialidades &&
        data.especialidades.length > 0
      ) {
        data.especialidades.forEach((espNombre, idx) => {
          const trimmed = espNombre.trim();
          if (
            trimmed &&
            !specialtiesToCreate.some((s) => s.nombre.toLowerCase() === trimmed.toLowerCase())
          ) {
            specialtiesToCreate.push({ nombre: trimmed, esPrincipal: idx === 0 });
          }
        });
      }

      if (specialtiesToCreate.length > 0) {
        const currentNivel = data.nivelEducativo || esp.nivelEducativo;
        const nivel = await tx.nivelEducativo.findFirst({
          where: { nombre: currentNivel },
        });

        if (nivel) {
          for (const item of specialtiesToCreate) {
            const especialidadEntity = await tx.especialidad.upsert({
              where: {
                nombre_nivelEducativoId: {
                  nombre: item.nombre,
                  nivelEducativoId: nivel.id,
                },
              },
              update: {},
              create: {
                nombre: item.nombre,
                nivelEducativoId: nivel.id,
                isActive: true,
              },
            });

            await tx.especialistaEspecialidad.create({
              data: {
                especialistaId: id,
                especialidadId: especialidadEntity.id,
                esPrincipal: item.esPrincipal,
              },
            });
          }
        }
      }
    }

    const fullEsp = await tx.especialista.findUniqueOrThrow({
      where: { id },
      include: ESPECIALISTA_INCLUDE,
    });

    return mapEspecialista(fullEsp);
  });
}
