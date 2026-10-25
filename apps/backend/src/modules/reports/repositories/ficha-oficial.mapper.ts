import type { Prisma } from '../../../generated/prisma/client.js';
import type { FichaOficialPersistida } from '../services/ficha-oficial-docente.imagenes.js';

/**
 * Lo que hay que cargar de una ficha para imprimirla en el formulario oficial:
 * la plantilla con sus rúbricas y aspectos, las respuestas, las personas y las
 * firmas. El director de la institución y el lema del año salen de consultas
 * aparte, porque no cuelgan de la ficha.
 */
export const INCLUDE_FICHA_OFICIAL = {
  fichaContexto: true,
  plantilla: {
    include: {
      nivelesCalificacion: true,
      ejesItems: true,
      desempenos: {
        include: {
          aspectos: true,
          rubrica: { include: { nivelCalificacion: true } },
        },
      },
    },
  },
  respuestasDesempeno: true,
  respuestasEjeItem: true,
  cronograma: {
    include: {
      institucion: true,
      evaluado: { include: { persona: true } },
      monitor: { include: { persona: true } },
    },
  },
  firmas: {
    include: { firmante: { include: { persona: true } } },
  },
} satisfies Prisma.FichaMonitoreoInclude;

export type FichaOficialRecord = Prisma.FichaMonitoreoGetPayload<{
  include: typeof INCLUDE_FICHA_OFICIAL;
}>;

export interface DirectorRecord {
  condicionLaboral: string | null;
  persona: {
    nombres: string;
    apellidos: string;
    dni: string;
    correo: string | null;
    telefono: string | null;
  };
}

export function fromPrismaFichaOficial(
  f: FichaOficialRecord,
  director: DirectorRecord | null,
  lema: string | null,
): FichaOficialPersistida {
  const { cronograma, plantilla, fichaContexto } = f;

  return {
    anioAcademico: f.anioAcademico,
    lema,
    puntajeTotal: f.puntajeTotal,
    promedio: f.promedio === null ? null : Number(f.promedio),
    nivelLogro: f.nivelLogro,
    observaciones: f.observaciones,
    sugerencias: f.sugerencias,
    compromisos: f.compromisos,
    finalizadaAt: f.finalizadaAt,
    contexto: {
      areaCurricular: fichaContexto.areaCurricular,
      grado: fichaContexto.grado,
      seccion: fichaContexto.seccion,
      cantidadEstudiantes: fichaContexto.cantidadEstudiantes,
      cantidadEstudiantesNee: fichaContexto.cantidadEstudiantesNee,
    },
    plantilla: {
      niveles: plantilla.nivelesCalificacion.map((n) => ({
        nivelRomano: n.nivelRomano,
        denominacion: n.denominacion,
        orden: n.orden,
      })),
      desempenos: plantilla.desempenos.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        descripcionCorta: d.descripcionCorta,
        orden: d.orden,
        preguntaExtra: d.preguntaExtra,
        aspectos: d.aspectos.map((a) => ({ id: a.id, descripcion: a.descripcion, orden: a.orden })),
        rubrica: d.rubrica.map((r) => ({
          descripcion: r.descripcion,
          nivelCalificacion: { nivelRomano: r.nivelCalificacion.nivelRomano },
        })),
      })),
      ejesItems: plantilla.ejesItems.map((e) => ({
        id: e.id,
        numero: e.numero,
        descripcion: e.descripcion,
        orden: e.orden,
      })),
    },
    respuestasDesempeno: f.respuestasDesempeno.map((r) => ({
      desempenoId: r.desempenoId,
      nivel: r.nivel,
      observaciones: r.observaciones,
      preguntaExtraRespuesta: r.preguntaExtraRespuesta,
    })),
    respuestasEjeItem: f.respuestasEjeItem.map((r) => ({
      ejeItemId: r.ejeItemId,
      nivel: r.nivel,
      observacion: r.observacion,
      evidenciaUrl: r.evidenciaUrl,
    })),
    cronograma: {
      fechaProgramada: cronograma.fechaProgramada,
      horaInicio: cronograma.horaInicio,
      institucion: {
        nombre: cronograma.institucion.nombre,
        codigoModular: cronograma.institucion.codigoModular,
        modalidad: cronograma.institucion.modalidad,
        nivelEducativo: cronograma.institucion.nivelEducativo,
        departamento: cronograma.institucion.departamento,
        provincia: cronograma.institucion.provincia,
        distrito: cronograma.institucion.distrito,
        direccion: cronograma.institucion.direccion,
        zona: cronograma.institucion.zona,
      },
      evaluado: {
        condicionLaboral: cronograma.evaluado.condicionLaboral,
        modalidad: cronograma.evaluado.modalidad,
        nivelEducativo: cronograma.evaluado.nivelEducativo,
        persona: cronograma.evaluado.persona,
      },
      monitor: { cargo: cronograma.monitor.cargo, persona: cronograma.monitor.persona },
    },
    director: director
      ? {
          nombre: `${director.persona.nombres} ${director.persona.apellidos}`.trim(),
          dni: director.persona.dni,
          correo: director.persona.correo,
          telefono: director.persona.telefono,
          condicion: director.condicionLaboral,
        }
      : null,
    firmas: f.firmas.map((firma) => ({
      rolFirmante: firma.rolFirmante,
      nombre: `${firma.firmante.persona.nombres} ${firma.firmante.persona.apellidos}`.trim(),
      fecha: firma.createdAt,
      imagenUrl: firma.imagenUrl,
    })),
    evidenciaGeneral: f.evidenciaGeneral,
  };
}
