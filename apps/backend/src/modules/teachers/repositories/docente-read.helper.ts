import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { DocenteFilter } from './teachers.repository.js';
import { mapDocente } from './docente-mapper.helper.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';

const DOCENTE_INCLUDE = {
  persona: true,
  docenteCargos: { include: { cargo: true } },
  docenteCursos: { include: { curso: true } },
  docenteEspecialidades: { include: { especialidad: true } },
  docenteSecciones: true,
  evaluadoresAsignados: {
    where: { isActive: true },
    include: {
      evaluador: {
        include: { persona: true },
      },
    },
  },
} as const;

export async function findDocenteById(prisma: PrismaService, id: string) {
  const docente = await prisma.docente.findUnique({
    where: { id },
    include: DOCENTE_INCLUDE,
  });
  if (!docente) return null;
  return mapDocente(docente);
}

export async function findDocentes(prisma: PrismaService, filter?: DocenteFilter) {
  const where: Prisma.DocenteWhereInput = {};
  const andConditions: Prisma.DocenteWhereInput[] = [];

  if (filter?.institucionId) {
    andConditions.push({ institucionId: filter.institucionId });
  }

  if (filter?.especialistaNivel) {
    const jefeNivel = filter.especialistaNivel;
    if (jefeNivel === 'Inicial') {
      andConditions.push({
        OR: [
          { modalidad: 'EBE' },
          { modalidad: 'EBR', nivelEducativo: { equals: 'Inicial', mode: 'insensitive' } },
        ],
      });
    } else if (jefeNivel === 'Primaria') {
      andConditions.push({
        modalidad: 'EBR',
        nivelEducativo: { equals: 'Primaria', mode: 'insensitive' },
      });
    } else if (jefeNivel === 'Secundaria') {
      andConditions.push({
        OR: [
          { modalidad: 'EBA' },
          { modalidad: 'CEPTRO' },
          { modalidad: 'EBR', nivelEducativo: { equals: 'Secundaria', mode: 'insensitive' } },
        ],
      });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const list = await prisma.docente.findMany({
    where,
    include: DOCENTE_INCLUDE,
  });
  return list.map((d) => mapDocente(d));
}

export async function findPersonaByDni(prisma: PrismaService, dni: string) {
  const persona = await prisma.persona.findUnique({
    where: { dni },
    include: {
      usuario: { select: { id: true, isActive: true, isFirstLogin: true } },
      docente: {
        include: {
          institucion: true,
          docenteCargos: {
            where: { fechaFin: null },
            include: { cargo: true },
          },
          docenteCursos: {
            include: { curso: true },
          },
          docenteEspecialidades: {
            include: { especialidad: true },
          },
        },
      },
      especialista: {
        include: {
          cargos: {
            where: { fechaFin: null },
            orderBy: { esPrincipal: 'desc' },
          },
        },
      },
    },
  });
  if (!persona) return null;

  const docenteCargosActivos = persona.docente?.docenteCargos?.map((dc) => dc.cargo.nombre) ?? [];
  const esDirector = docenteCargosActivos.includes(CargoNombre.DIRECTOR);
  const esCoordinadorPedagogico = docenteCargosActivos.includes(CargoNombre.COORDINADOR_PEDAGOGICO);
  const esJefeTaller = docenteCargosActivos.includes(CargoNombre.JEFE_TALLER);
  const esDocenteAula = docenteCargosActivos.includes(CargoNombre.DOCENTE_AULA);

  const especialistaCargoActivo =
    persona.especialista?.cargos?.[0]?.cargo ?? persona.especialista?.cargo ?? null;

  return {
    id: persona.id,
    dni: persona.dni,
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    correo: persona.correo,
    telefono: persona.telefono,
    tieneUsuario: persona.usuario != null,
    roles: {
      esDocente: persona.docente != null,
      docenteInstitucionId: persona.docente?.institucionId ?? null,
      docenteNivelEducativo: persona.docente?.nivelEducativo ?? null,
      docenteCargosActivos,
      esDirector,
      esCoordinadorPedagogico,
      esJefeTaller,
      esDocenteAula,
      esEspecialista: persona.especialista != null,
      especialistaCargoActivo,
      especialistaNivelEducativo: persona.especialista?.nivelEducativo ?? null,
      especialistaModalidad: persona.especialista?.modalidad ?? null,
      especialistaEstado: persona.especialista?.estado ?? null,
    },
    docente: persona.docente
      ? {
          id: persona.docente.id,
          institucionId: persona.docente.institucionId,
          institucion: persona.docente.institucion
            ? {
                id: persona.docente.institucion.id,
                nombre: persona.docente.institucion.nombre,
                codigoModular: persona.docente.institucion.codigoModular,
                nivel: persona.docente.institucion.nivelEducativo,
              }
            : undefined,
          nivelEducativo: persona.docente.nivelEducativo,
          condicionLaboral: persona.docente.condicionLaboral,
          escalaMagisterial: persona.docente.escalaMagisterial,
          cargosActivos: docenteCargosActivos,
          cursoAsignado: persona.docente.docenteCursos?.[0]?.curso?.nombre ?? null,
          especialidad: persona.docente.docenteEspecialidades?.[0]?.especialidad?.nombre ?? null,
        }
      : null,
  };
}
