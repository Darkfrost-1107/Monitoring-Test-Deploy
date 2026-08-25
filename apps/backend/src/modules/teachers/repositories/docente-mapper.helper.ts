import type { Prisma } from '../../../generated/prisma/client.js';
import type { DocenteEntity } from './teachers.repository.js';

type AsignacionConEvaluador = Prisma.AsignacionEvaluadorGetPayload<{
  include: { evaluador: { include: { persona: true } } };
}>;

type DocenteWithRelations = Prisma.DocenteGetPayload<{
  include: {
    persona: true;
    docenteCargos: { include: { cargo: true } };
    docenteCursos: { include: { curso: true } };
    docenteSecciones: true;
    docenteEspecialidades: { include: { especialidad: true } };
  };
}> & {
  // Solo lo incluyen algunos lectores (findDocenteById/findDocentes); opcional.
  evaluadoresAsignados?: AsignacionConEvaluador[];
};

export function mapDocente(docente: DocenteWithRelations): DocenteEntity {
  const asig = docente.evaluadoresAsignados?.[0];

  // La principal primero, luego las extras: así el string `especialidad` la
  // ofrece por defecto y el formulario puede separar unas de otras al reeditar.
  const especialidadesOrdenadas = [...(docente.docenteEspecialidades ?? [])]
    .sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal))
    .map((de) => de.especialidad?.nombre)
    .filter((nombre): nombre is string => Boolean(nombre));
  const especialidadesExtras = (docente.docenteEspecialidades ?? [])
    .filter((de) => !de.esPrincipal)
    .map((de) => de.especialidad?.nombre)
    .filter((nombre): nombre is string => Boolean(nombre));

  return {
    id: docente.id,
    personaId: docente.personaId,
    institucionId: docente.institucionId,
    gradoAcademico: docente.gradoAcademico,
    nivelEducativo: docente.nivelEducativo,
    modalidad: docente.modalidad ?? null,
    especialidad: especialidadesOrdenadas.join(', ') || null,
    especialidadesExtras,
    cursoAsignado: docente.docenteCursos?.[0]?.curso?.nombre || null,
    condicionLaboral: docente.condicionLaboral,
    escalaMagisterial: docente.escalaMagisterial,
    estado: docente.estado,
    createdAt: docente.createdAt,
    updatedAt: docente.updatedAt,
    persona: {
      id: docente.persona.id,
      dni: docente.persona.dni,
      nombres: docente.persona.nombres,
      apellidos: docente.persona.apellidos,
      correo: docente.persona.correo,
      telefono: docente.persona.telefono,
    },
    docenteCargos: docente.docenteCargos.map((dc) => ({
      id: dc.id,
      cargoId: dc.cargoId,
      fechaInicio: dc.fechaInicio,
      fechaFin: dc.fechaFin,
      esPrincipal: dc.esPrincipal,
      cargo: {
        id: dc.cargo.id,
        nombre: dc.cargo.nombre,
      },
    })),
    docenteSecciones:
      docente.docenteSecciones?.map((ds) => ({
        id: ds.id,
        grado: ds.grado,
        seccion: ds.seccion,
      })) || [],
    evaluadorActual: asig
      ? {
          id: asig.id,
          evaluadorId: asig.evaluadorId,
          evaluadorNombres: asig.evaluador.persona.nombres,
          evaluadorApellidos: asig.evaluador.persona.apellidos,
        }
      : null,
  };
}
