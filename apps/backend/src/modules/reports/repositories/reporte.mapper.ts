import type {
  IReporteFicha,
  NivelLogro,
  TipoMonitoreo,
  EstadoFicha,
} from '@sistema-monitoreo/shared-contracts';
import type { Prisma } from '../../../generated/prisma/client.js';

type FichaReportePayload = Prisma.FichaMonitoreoGetPayload<{
  include: {
    cronograma: {
      include: {
        institucion: { select: { id: true; codigoModular: true; nombre: true } };
        evaluado: { include: { persona: { select: { nombres: true; apellidos: true } } } };
        monitor: { include: { persona: { select: { nombres: true; apellidos: true } } } };
      };
    };
    firmas: {
      include: {
        firmante: { include: { persona: { select: { nombres: true; apellidos: true } } } };
      };
    };
  };
}>;

export function fromPrismaFichaReporte(f: FichaReportePayload): IReporteFicha {
  return {
    id: f.id,
    cronogramaId: f.cronogramaId,
    institucionId: f.cronograma.institucion.id,
    institucionNombre: f.cronograma.institucion.nombre,
    institucionCodigoModular: f.cronograma.institucion.codigoModular,
    evaluadoId: f.cronograma.evaluadoId,
    evaluadoNombre: `${f.cronograma.evaluado.persona.nombres} ${f.cronograma.evaluado.persona.apellidos}`,
    especialistaId: f.cronograma.monitorId,
    especialistaNombre: `${f.cronograma.monitor.persona.nombres} ${f.cronograma.monitor.persona.apellidos}`,
    tipoMonitoreo: f.cronograma.tipoMonitoreo as TipoMonitoreo,
    anioAcademico: f.anioAcademico,
    nivelLogro: f.nivelLogro as NivelLogro,
    promedio: Number(f.promedio),
    puntajeTotal: f.puntajeTotal,
    estado: f.estado as EstadoFicha,
    correoEnviado: f.correoEnviado,
    fechaEjecucion: f.createdAt.toISOString(),
    fechaProgramada: f.cronograma.fechaProgramada
      ? f.cronograma.fechaProgramada.toISOString().split('T')[0]
      : undefined,
    horaInicio: f.cronograma.horaInicio ?? undefined,
    horaFin: f.finalizadaAt ? f.finalizadaAt.toISOString() : undefined,
    modalidad: f.cronograma.modalidad,
    nivel: f.cronograma.nivelEducativo,
    firmas: f.firmas?.map((firma) => ({
      rolFirmante: firma.rolFirmante,
      firmanteNombre: `${firma.firmante.persona.nombres} ${firma.firmante.persona.apellidos}`,
      imagenUrl: firma.imagenUrl ?? '',
      fechaFirma: firma.createdAt.toISOString(),
    })),
  };
}
