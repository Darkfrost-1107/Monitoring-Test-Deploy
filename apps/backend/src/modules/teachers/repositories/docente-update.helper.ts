import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { UpdateDocenteDto } from '../dto/update-docente.dto.js';
import type { DocenteCargo } from '../../../generated/prisma/client.js';
import { mapDocente } from './docente-mapper.helper.js';
import {
  checkDirectorConflict,
  checkPersonaYaEsDirector,
  upsertCurso,
  upsertEspecialidad,
  syncEspecialista,
  resolveRoleCode,
} from './docente-shared.helper.js';

const DOCENTE_INCLUDE = {
  persona: true,
  docenteCargos: { include: { cargo: true }, orderBy: { fechaInicio: 'desc' } },
  docenteCursos: { include: { curso: true } },
  docenteEspecialidades: { include: { especialidad: true } },
  docenteSecciones: true,
} as const;

export async function updateDocenteWithTransaction(
  prisma: PrismaService,
  id: string,
  dto: UpdateDocenteDto,
  activeCargo: DocenteCargo | null,
  personaId: string,
) {
  return prisma.$transaction(async (tx) => {
    const cargo = await tx.cargo.findUnique({ where: { id: dto.cargoId } });

    if (cargo?.nombre === 'Director') {
      const targetInstitucionId =
        dto.institucionId || (await tx.docente.findUnique({ where: { id } }))?.institucionId;
      if (targetInstitucionId) {
        await checkDirectorConflict(tx, targetInstitucionId, id);
      }
      // Un director dirige un solo colegio; se excluye el propio registro para
      // que editarlo no choque consigo mismo.
      await checkPersonaYaEsDirector(tx, personaId, id);
    }

    await tx.persona.update({
      where: { id: personaId },
      data: {
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        correo: dto.correo !== undefined ? dto.correo || null : undefined,
        telefono: dto.telefono !== undefined ? dto.telefono || null : undefined,
      },
    });

    const docente = await tx.docente.update({
      where: { id },
      data: {
        gradoAcademico: dto.gradoAcademico ?? null,
        nivelEducativo: dto.nivelEducativo,
        condicionLaboral: dto.condicionLaboral ?? null,
        escalaMagisterial: dto.escalaMagisterial ?? null,
        ...(dto.institucionId && { institucionId: dto.institucionId }),
      },
    });

    await tx.docenteCurso.deleteMany({ where: { docenteId: id } });
    if (dto.cursoAsignado) {
      await upsertCurso(tx, prisma, dto.cursoAsignado, dto.nivelEducativo, id);
    }

    await tx.docenteEspecialidad.deleteMany({ where: { docenteId: id } });
    if (dto.especialidad) {
      await upsertEspecialidad(tx, prisma, dto.especialidad, dto.nivelEducativo, id);
    }

    await tx.docenteSeccion.deleteMany({ where: { docenteId: id } });
    if (dto.secciones?.length) {
      await tx.docenteSeccion.createMany({
        data: dto.secciones.map((s) => ({ docenteId: id, grado: s.grado, seccion: s.seccion })),
      });
    }

    if (!activeCargo || activeCargo.cargoId !== dto.cargoId) {
      if (activeCargo) {
        await tx.docenteCargo.update({
          where: { id: activeCargo.id },
          data: { fechaFin: new Date() },
        });
      }
      await tx.docenteCargo.create({
        data: { docenteId: id, cargoId: dto.cargoId, fechaInicio: new Date() },
      });
    }

    if (!activeCargo || activeCargo.cargoId !== dto.cargoId) {
      const roleCode = resolveRoleCode(cargo?.nombre ?? '');
      const role = await tx.role.findUnique({ where: { codigo: roleCode } });
      if (role) {
        await tx.usuario.updateMany({
          where: { personaId },
          data: { rolId: role.id },
        });
      }
    }

    if (cargo) {
      const espEstado = docente.estado || 'Activo';
      await syncEspecialista(
        tx,
        personaId,
        cargo.nombre,
        dto.nivelEducativo,
        dto.condicionLaboral ?? null,
        dto.cargaLaboral ?? null,
        docente.modalidad ?? null,
        dto.escalaMagisterial ?? null,
        espEstado,
      );
    }

    const fullDocente = await tx.docente.findUniqueOrThrow({
      where: { id },
      include: DOCENTE_INCLUDE,
    });
    return mapDocente(fullDocente);
  });
}
