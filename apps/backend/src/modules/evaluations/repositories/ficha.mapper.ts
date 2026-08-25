import type { Prisma } from '../../../generated/prisma/client.js';
import type {
  IFichaMonitoreo,
  IFichaContexto,
  IFichaRespuestaDesempeno,
  IFichaRespuestaAspecto,
  IFichaRespuestaEjeItem,
  NivelLogro,
  EstadoFicha,
} from '@sistema-monitoreo/shared-contracts';

type FichaContextoPayload = Prisma.FichaContextoGetPayload<Record<string, never>>;

export function mapContexto(c: FichaContextoPayload): IFichaContexto {
  return {
    id: c.id,
    areaCurricular: c.areaCurricular,
    grado: c.grado,
    seccion: c.seccion,
    cantidadEstudiantes: c.cantidadEstudiantes,
    cantidadEstudiantesNee: c.cantidadEstudiantesNee,
    cursoId: c.cursoId,
  };
}

type FichaMonitoreoPayload = Prisma.FichaMonitoreoGetPayload<{
  include: {
    fichaContexto: true;
    respuestasDesempeno: true;
    respuestasAspecto: true;
    respuestasEjeItem: true;
    plantilla: { select: { id: true; version: true; estado: true } };
  };
}>;

export function fromPrismaFicha(ficha: FichaMonitoreoPayload): IFichaMonitoreo {
  const requiereMigracion = ficha.plantilla?.estado === 'Historico';

  return {
    id: ficha.id,
    cronogramaId: ficha.cronogramaId,
    plantillaId: ficha.plantillaId,
    plantillaVersion: ficha.plantilla?.version ?? 0,
    fichaContextoId: ficha.fichaContextoId,
    anioAcademico: ficha.anioAcademico,
    puntajeTotal: ficha.puntajeTotal,
    // El EIB informativo se guarda sin puntaje ni nivel (null).
    promedio: ficha.promedio === null ? null : Number(ficha.promedio),
    nivelLogro: ficha.nivelLogro as NivelLogro | null,
    estado: ficha.estado as EstadoFicha,
    contexto: mapContexto(ficha.fichaContexto),
    respuestasDesempeno: (ficha.respuestasDesempeno || []).map(fromPrismaRespuestaDesempeno),
    respuestasAspecto: (ficha.respuestasAspecto || []).map(fromPrismaRespuestaAspecto),
    respuestasEjeItem: (ficha.respuestasEjeItem || []).map(fromPrismaRespuestaEjeItem),
    creadoPorId: ficha.creadoPorId,
    finalizadaPorId: ficha.finalizadaPorId,
    observaciones: ficha.observaciones,
    sugerencias: ficha.sugerencias || null,
    compromisos: ficha.compromisos || null,
    evidenciaGeneral: ficha.evidenciaGeneral || null,
    requiereMigracion,
    plantillaHistoricaId: requiereMigracion ? ficha.plantillaId : null,
    createdAt: ficha.createdAt.toISOString(),
    finalizadaAt: ficha.finalizadaAt ? ficha.finalizadaAt.toISOString() : null,
  };
}

type RespuestaDesempenoPayload = Prisma.FichaRespuestaDesempenoGetPayload<Record<string, never>>;
function fromPrismaRespuestaDesempeno(r: RespuestaDesempenoPayload): IFichaRespuestaDesempeno {
  return {
    id: r.id,
    fichaId: r.fichaId,
    desempenoId: r.desempenoId,
    nivel: r.nivel,
    observaciones: r.observaciones,
    preguntaExtraRespuesta: r.preguntaExtraRespuesta,
  };
}

type RespuestaAspectoPayload = Prisma.FichaRespuestaAspectoGetPayload<Record<string, never>>;
function fromPrismaRespuestaAspecto(r: RespuestaAspectoPayload): IFichaRespuestaAspecto {
  return {
    id: r.id,
    fichaId: r.fichaId,
    aspectoId: r.aspectoId,
    marcado: r.marcado,
  };
}

type RespuestaEjeItemPayload = Prisma.FichaRespuestaEjeItemGetPayload<Record<string, never>>;
function fromPrismaRespuestaEjeItem(r: RespuestaEjeItemPayload): IFichaRespuestaEjeItem {
  return {
    id: r.id,
    fichaId: r.fichaId,
    ejeItemId: r.ejeItemId,
    nivel: r.nivel,
    evidenciaUrl: r.evidenciaUrl,
    observacion: r.observacion,
  };
}
