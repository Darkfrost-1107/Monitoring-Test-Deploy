import { ConflictException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';

export async function checkDirectorConflict(
  tx: Prisma.TransactionClient,
  institucionId: string,
  excludeDocenteId?: string,
): Promise<void> {
  const where: Prisma.DocenteCargoWhereInput = {
    docente: { institucionId },
    cargo: { nombre: 'Director' },
    fechaFin: null,
  };
  if (excludeDocenteId) {
    where.docenteId = { not: excludeDocenteId };
  }

  const activeDirector = await tx.docenteCargo.findFirst({
    where,
    include: { docente: { include: { persona: true } } },
  });

  if (activeDirector) {
    const p = activeDirector.docente.persona;
    throw new ConflictException(
      `La institución educativa ya cuenta con un director activo (${p.nombres} ${p.apellidos}).`,
    );
  }
}

/**
 * Impide que una misma persona quede como director activo de dos instituciones.
 *
 * Fase 6 de PLAN_REMEDIACION.md. El formulario bloqueaba esto desde siempre
 * —`shared/constants/roleValidation.ts`, caso `director`— pero el servidor sólo
 * verificaba que la institución de destino no tuviera ya un director. Con la
 * institución de destino vacía, `checkDirectorConflict` no encontraba nada y el
 * segundo registro se creaba: bastaba con llamar a la API sin pasar por el
 * formulario.
 *
 * Regla confirmada con el área: un director dirige un solo colegio.
 */
export async function checkPersonaYaEsDirector(
  tx: Prisma.TransactionClient,
  personaId: string,
  excludeDocenteId?: string,
): Promise<void> {
  const where: Prisma.DocenteCargoWhereInput = {
    docente: { personaId },
    cargo: { nombre: 'Director' },
    fechaFin: null,
  };
  if (excludeDocenteId) {
    where.docenteId = { not: excludeDocenteId };
  }

  const yaDirige = await tx.docenteCargo.findFirst({
    where,
    include: { docente: { include: { institucion: true, persona: true } } },
  });

  if (yaDirige) {
    const institucion = yaDirige.docente.institucion?.nombre ?? 'otra institución';
    throw new ConflictException(
      `Esta persona ya es director activo en "${institucion}". Un director solo puede dirigir una institución educativa.`,
    );
  }
}

export async function upsertCurso(
  tx: Prisma.TransactionClient,
  prisma: PrismaService,
  cursoAsignado: string,
  nivelEducativo: string,
  docenteId: string,
): Promise<void> {
  const nivel = await prisma.nivelEducativo.findFirst({
    where: {
      codigo: { equals: nivelEducativo, mode: 'insensitive' },
      isActive: true,
    },
  });
  if (!nivel) {
    throw new BadRequestException(`No se encontró el nivel educativo: ${nivelEducativo}`);
  }

  const curso = await tx.curso.upsert({
    where: {
      nombre_nivelEducativoId: {
        nombre: cursoAsignado,
        nivelEducativoId: nivel.id,
      },
    },
    update: {},
    create: {
      nombre: cursoAsignado,
      nivelEducativoId: nivel.id,
    },
  });

  await tx.docenteCurso.create({
    data: { docenteId, cursoId: curso.id },
  });
}

export async function upsertEspecialidad(
  tx: Prisma.TransactionClient,
  prisma: PrismaService,
  especialidadAsignada: string,
  nivelEducativo: string,
  docenteId: string,
): Promise<void> {
  const nivel = await prisma.nivelEducativo.findFirst({
    where: {
      codigo: { equals: nivelEducativo, mode: 'insensitive' },
      isActive: true,
    },
  });
  if (!nivel) {
    throw new BadRequestException(`No se encontró el nivel educativo: ${nivelEducativo}`);
  }

  const especialidad = await tx.especialidad.upsert({
    where: {
      nombre_nivelEducativoId: {
        nombre: especialidadAsignada,
        nivelEducativoId: nivel.id,
      },
    },
    update: {},
    create: {
      nombre: especialidadAsignada,
      nivelEducativoId: nivel.id,
    },
  });

  const exists = await tx.docenteEspecialidad.findUnique({
    where: {
      docenteId_especialidadId: {
        docenteId,
        especialidadId: especialidad.id,
      },
    },
  });

  if (!exists) {
    await tx.docenteEspecialidad.create({
      data: { docenteId, especialidadId: especialidad.id },
    });
  }
}

export async function syncEspecialista(
  tx: Prisma.TransactionClient,
  personaId: string,
  cargoNombre: string,
  nivelEducativo: string,
  condicionLaboral: string | null,
  cargaLaboral: number | null,
  modalidad: string | null,
  escalaMagisterial: number | string | null,
  estado?: string,
): Promise<void> {
  const isMonitor = ['Coordinador Pedagógico', 'Jefe de Taller'].includes(cargoNombre);
  const escalaNum = escalaMagisterial != null ? Number(escalaMagisterial) : null;
  if (isMonitor) {
    await tx.especialista.upsert({
      where: { personaId },
      update: {
        cargo: cargoNombre,
        nivelEducativo,
        condicionLaboral: condicionLaboral || 'Nombrado',
        cargaLaboral: cargaLaboral ?? (cargoNombre === 'Coordinador Pedagógico' ? 40 : 30),
        estado: estado ?? EstadoRegistro.ACTIVO,
        modalidad: modalidad ?? 'EBR',
        escalaMagisterial: escalaNum,
      },
      create: {
        personaId,
        cargo: cargoNombre,
        nivelEducativo,
        condicionLaboral: condicionLaboral || 'Nombrado',
        cargaLaboral: cargaLaboral ?? (cargoNombre === 'Coordinador Pedagógico' ? 40 : 30),
        estado: estado ?? EstadoRegistro.ACTIVO,
        modalidad: modalidad ?? 'EBR',
        escalaMagisterial: escalaNum,
      },
    });
  } else {
    const existingEsp = await tx.especialista.findUnique({ where: { personaId } });
    if (existingEsp) {
      await tx.especialista.delete({ where: { personaId } });
    }
  }
}

export function resolveRoleCode(cargoNombre: string): string {
  if (cargoNombre === 'Director') return 'director_institucion';
  if (cargoNombre === 'Coordinador Pedagógico') return 'coordinador_pedagogico';
  if (cargoNombre === 'Jefe de Taller') return 'jefe_taller';
  return 'docente';
}
