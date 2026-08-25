import type {
  IReporteFicha,
  NivelLogro,
  TipoPlantilla,
  EstadoFicha,
} from '@sistema-monitoreo/shared-contracts';
import type { Prisma } from '../../../generated/prisma/client.js';

type FichaReportePayload = Prisma.FichaMonitoreoGetPayload<{
  include: {
    plantilla: { select: { id: true; tipoMonitoreo: true; descripcion: true } };
    respuestasDesempeno: {
      include: {
        desempeno: { select: { id: true; nombre: true; orden: true; descripcionCorta: true } };
      };
    };
    respuestasEjeItem: {
      include: {
        ejeItem: { select: { id: true; descripcion: true; orden: true } };
      };
    };
    cronograma: {
      include: {
        institucion: { select: { id: true; codigoModular: true; nombre: true } };
        evaluado: {
          include: {
            persona: { select: { nombres: true; apellidos: true; dni: true; telefono: true } };
          };
        };
        monitor: {
          include: {
            persona: { select: { nombres: true; apellidos: true; dni: true; telefono: true } };
          };
        };
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
  /**
   * El instrumento de la ficha sale de SU PLANTILLA.
   *
   * Antes era `f.plantilla?.tipoMonitoreo || f.cronograma.tipoMonitoreo`, de modo
   * que el mismo campo traía el instrumento o el tipo de la visita según los
   * datos. Ningún consumidor podía confiar en él, y por eso el frontend acabó
   * olfateando cadenas —incluido el nombre de la plantilla— para deducir si la
   * ficha era EIB.
   *
   * El respaldo sobre el cronograma se conserva para las fichas anteriores a que
   * `plantillaId` fuera obligatorio, pero ya no puede aportar `DOCENTE_EIB`: una
   * visita nunca fue EIB, y si llegara ese valor sería un dato inconsistente.
   */
  const instrumento = (f.plantilla?.tipoMonitoreo ?? f.cronograma.tipoMonitoreo) as TipoPlantilla;

  const respuestas: {
    nombre: string;
    orden?: number;
    nivel: number;
    observaciones?: string | null;
  }[] = [];

  if (f.respuestasDesempeno && f.respuestasDesempeno.length > 0) {
    const ordenados = [...f.respuestasDesempeno].sort(
      (a, b) => (a.desempeno?.orden ?? 0) - (b.desempeno?.orden ?? 0),
    );
    for (const rd of ordenados) {
      respuestas.push({
        nombre: rd.desempeno?.nombre || 'Desempeño',
        orden: rd.desempeno?.orden,
        nivel: rd.nivel,
        observaciones: rd.observaciones,
      });
    }
  } else if (f.respuestasEjeItem && f.respuestasEjeItem.length > 0) {
    const ordenados = [...f.respuestasEjeItem].sort(
      (a, b) => (a.ejeItem?.orden ?? 0) - (b.ejeItem?.orden ?? 0),
    );
    for (const re of ordenados) {
      respuestas.push({
        nombre: re.ejeItem?.descripcion || 'Ítem',
        orden: re.ejeItem?.orden,
        nivel: re.nivel,
        observaciones: re.observacion,
      });
    }
  }

  return {
    id: f.id,
    cronogramaId: f.cronogramaId,
    plantillaId: f.plantillaId,
    plantillaNombre: f.plantilla?.descripcion ?? undefined,
    institucionId: f.cronograma.institucion.id,
    institucionNombre: f.cronograma.institucion.nombre,
    institucionCodigoModular: f.cronograma.institucion.codigoModular,
    evaluadoId: f.cronograma.evaluadoId,
    evaluadoNombre: `${f.cronograma.evaluado.persona.nombres} ${f.cronograma.evaluado.persona.apellidos}`,
    evaluadoDni: f.cronograma.evaluado.persona.dni,
    evaluadoTelefono: f.cronograma.evaluado.persona.telefono ?? undefined,
    especialistaId: f.cronograma.monitorId,
    especialistaNombre: `${f.cronograma.monitor.persona.nombres} ${f.cronograma.monitor.persona.apellidos}`,
    instrumento,
    anioAcademico: f.anioAcademico,
    // El EIB informativo se guarda sin nivel ni puntaje (null).
    nivelLogro: f.nivelLogro as NivelLogro | null,
    promedio: f.promedio === null ? null : Number(f.promedio),
    puntajeTotal: f.puntajeTotal,
    estado: f.estado as EstadoFicha,
    observaciones: f.observaciones,
    compromisos: f.compromisos,
    sugerencias: f.sugerencias,
    respuestas: respuestas.length > 0 ? respuestas : undefined,
    correoEnviado: f.correoEnviado,
    fechaEjecucion: f.createdAt.toISOString(),
    fechaProgramada: f.cronograma.fechaProgramada
      ? f.cronograma.fechaProgramada.toISOString().split('T')[0]
      : undefined,
    horaInicio: f.cronograma.horaInicio ?? undefined,
    horaFin: f.finalizadaAt ? f.finalizadaAt.toISOString() : undefined,
    modalidad: f.cronograma.modalidad,
    numeroVisita: f.cronograma.numeroVisita,
    nivel: f.cronograma.nivelEducativo,
    firmas: f.firmas?.map((firma) => ({
      rolFirmante: firma.rolFirmante,
      firmanteNombre: `${firma.firmante.persona.nombres} ${firma.firmante.persona.apellidos}`,
      imagenUrl: firma.imagenUrl ?? '',
      fechaFirma: firma.createdAt.toISOString(),
    })),
  };
}
