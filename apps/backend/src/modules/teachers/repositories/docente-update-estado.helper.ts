import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import { mapDocente } from './docente-mapper.helper.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';

const DOCENTE_INCLUDE = {
  persona: true,
  docenteCargos: { include: { cargo: true } },
  docenteCursos: { include: { curso: true } },
  docenteEspecialidades: { include: { especialidad: true } },
  docenteSecciones: true,
} as const;

export async function updateDocenteEstado(prisma: PrismaService, id: string, estado: string) {
  return prisma.$transaction(async (tx) => {
    const docente = await tx.docente.update({
      where: { id },
      data: { estado },
      include: DOCENTE_INCLUDE,
    });

    const existingEsp = await tx.especialista.findUnique({
      where: { personaId: docente.personaId },
    });
    if (existingEsp) {
      await tx.especialista.update({
        where: { id: existingEsp.id },
        data: { estado },
      });
    }

    if (estado === (EstadoRegistro.INACTIVO as string) || estado === 'Inactivo') {
      await tx.usuario.updateMany({
        where: { personaId: docente.personaId },
        data: { isActive: false },
      });
    } else if (estado === (EstadoRegistro.ACTIVO as string) || estado === 'Activo') {
      await tx.usuario.updateMany({
        where: { personaId: docente.personaId },
        data: { isActive: true },
      });
    }

    const fullDocente = await tx.docente.findUniqueOrThrow({
      where: { id },
      include: {
        ...DOCENTE_INCLUDE,
        docenteCargos: { include: { cargo: true }, orderBy: { fechaInicio: 'desc' } },
      },
    });

    return mapDocente(fullDocente);
  });
}

export async function bajaDirector(prisma: PrismaService, id: string) {
  return prisma.$transaction(async (tx) => {
    const docente = await tx.docente.findUniqueOrThrow({
      where: { id },
      include: { persona: true },
    });

    await tx.docenteCargo.deleteMany({
      where: {
        docenteId: id,
        cargo: { nombre: CargoNombre.DIRECTOR },
        fechaFin: null,
      },
    });

    const rolDocente = await tx.role.findUnique({
      where: { codigo: 'docente' },
    });
    if (rolDocente) {
      await tx.usuario.updateMany({
        where: { personaId: docente.persona.id },
        data: { rolId: rolDocente.id },
      });
    }

    // 4. Inactivar el docente y quitar la IE
    //    Usamos $executeRaw para poner institucionId = NULL porque el tipo generado
    //    por Prisma marca la relación como "Required" aunque el schema la tenga como opcional.
    await tx.docente.update({
      where: { id },
      data: { estado: EstadoRegistro.INACTIVO },
      include: DOCENTE_INCLUDE,
    });
    await tx.$executeRaw`UPDATE docentes SET institucion_id = NULL WHERE id = ${id}::uuid`;

    // 5. Inactivar el usuario opcionalmente (o dejarlo activo pero como docente sin IE)
    // Según plan, inactivamos el usuario
    await tx.usuario.updateMany({
      where: { personaId: docente.personaId },
      data: { isActive: false },
    });

    // 6. Si existe especialista, inactivarlo también
    const existingEsp = await tx.especialista.findUnique({
      where: { personaId: docente.personaId },
    });
    if (existingEsp) {
      await tx.especialista.update({
        where: { id: existingEsp.id },
        data: { estado: EstadoRegistro.INACTIVO },
      });
    }

    const fullDocente = await tx.docente.findUniqueOrThrow({
      where: { id },
      include: {
        ...DOCENTE_INCLUDE,
        docenteCargos: { include: { cargo: true }, orderBy: { fechaInicio: 'desc' } },
      },
    });

    return mapDocente(fullDocente);
  });
}
