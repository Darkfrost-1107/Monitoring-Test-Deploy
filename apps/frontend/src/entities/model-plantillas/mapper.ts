import type { IPlantilla, INivelCalificacion, IDesempeno, IAspecto, IRubricaNivel, IEjeItem, TipoPlantilla, EstadoPlantilla, RolAutorPlantilla, NivelRomano, Baremo } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla, NivelCalificacion, Desempeno, AspectoEvaluado, RubricaNivel, EjeItem } from './model';
import { aFechaISOLocal } from '@shared/lib/fecha/fecha';
import { ROTULO_DE_INSTRUMENTO } from './rotulo-de-instrumento';

const labelTipoMonitoreo = (tipo: TipoPlantilla): string =>
  ROTULO_DE_INSTRUMENTO[tipo] ?? tipo;

const mapNivel = (n: INivelCalificacion): NivelCalificacion => ({
  nivel: n.nivelRomano,
  denominacion: n.denominacion,
  rangoMin: n.rangoMin,
  color: n.color,
});

const mapAspecto = (a: IAspecto): AspectoEvaluado => ({
  id: a.id,
  descripcion: a.descripcion,
});

const mapRubrica = (r: IRubricaNivel): RubricaNivel => ({
  nivel: r.nivelRomano,
  descripcion: r.descripcion,
});

const mapEjeItem = (e: IEjeItem): EjeItem => ({
  id: e.id,
  numero: e.numero,
  descripcion: e.descripcion,
});

const mapDesempeno = (d: IDesempeno): Desempeno => ({
  id: d.id,
  nombre: d.nombre,
  descripcionCorta: d.descripcionCorta ?? '',
  preguntaExtra: d.preguntaExtra ?? '',
  aspectos: (d.aspectos ?? []).map(mapAspecto),
  rubrica: (d.rubrica ?? []).map(mapRubrica),
});

/**
 * Un instante del servidor, en el día que corresponde en Perú.
 *
 * `createdAt` y `updatedAt` son **instantes**, no fechas de calendario.
 * Cortarlos por la «T» devolvía el día en UTC: una plantilla creada un martes a
 * las 20:00 en Lima —miércoles 01:00 UTC— aparecía como del miércoles.
 *
 * Sin instante devuelve cadena vacía. Antes devolvía `hoyISO()`, de modo que una
 * plantilla sin fecha se mostraba como creada hoy; el catálogo ya sabe mostrar
 * «—» cuando no hay fecha.
 */
const aDiaLocal = (iso: string | undefined): string => (iso ? aFechaISOLocal(iso) : '');

/**
 * Convierte IPlantilla (backend) a Plantilla (modelo frontend).
 * - tipoMonitoreo: 'DOCENTE' → 'Monitoreo Docente' (etiqueta display)
 * - estado: 'Historico' (sin tilde) preservado tal cual
 * - fechaCreacion: extrae la fecha de createdAt (ISO → 'YYYY-MM-DD')
 * - creadoPorRole/ieId: mappea desde rolAutorAlCrear/institucionId
 */
export const mapIPlantillaToPlantilla = (p: IPlantilla): Plantilla => ({
  id: p.id,
  tipoMonitoreo: labelTipoMonitoreo(p.tipoMonitoreo),
  instrumento: p.tipoMonitoreo,
  anioAcademico: p.anioAcademico,
  lema: p.lema ?? null,
  baremo: p.baremo as Baremo,
  niveles: (p.niveles ?? []).map(mapNivel),
  desempenos: (p.desempenos ?? []).map(mapDesempeno),
  ejesItems: (p.ejesItems ?? []).map(mapEjeItem),
  fechaCreacion: aDiaLocal(p.createdAt),
  fechaActualizacion: aDiaLocal(p.updatedAt),
  version: p.version ?? 1,
  estado: p.estado as EstadoPlantilla,
  descripcion: p.descripcion ?? '',
  creadoPorRole: p.rolAutorAlCrear as RolAutorPlantilla,
  creadoPorId: p.autorId,
  autorNombre: p.autorNombre,
  ieId: p.institucionId ?? undefined,
  autorizada: p.autorizada,
  institucionNombre: p.institucion?.nombre,
});

export const mapIPlantillaListToPlantillaList = (list: IPlantilla[]): Plantilla[] =>
  (list ?? []).map(mapIPlantillaToPlantilla);

export const NIVEL_ROMANOS: readonly NivelRomano[] = ['I', 'II', 'III', 'IV'] as const;
