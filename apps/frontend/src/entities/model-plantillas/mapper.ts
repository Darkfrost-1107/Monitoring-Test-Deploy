import type { IPlantilla, INivelCalificacion, IDesempeno, IAspecto, IRubricaNivel, IEjeItem, TipoPlantilla, EstadoPlantilla, RolAutorPlantilla, NivelRomano, Baremo } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla, NivelCalificacion, Desempeno, AspectoEvaluado, RubricaNivel, EjeItem } from './model';
import { aFechaISOLocal } from '@shared/lib/fecha/fecha';

const TIPO_MONITOREO_LABEL: Record<TipoPlantilla, string> = {
  DOCENTE: 'Monitoreo Docente',
  DIRECTIVO: 'Monitoreo Directivo',
};

const labelTipoMonitoreo = (tipo: TipoPlantilla): string => TIPO_MONITOREO_LABEL[tipo] ?? tipo;

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
 * La fecha de creación de la plantilla, en el día que corresponde en Perú.
 *
 * `createdAt` es un **instante**, no una fecha de calendario. Cortarlo por la
 * «T» devolvía el día en UTC: una plantilla creada un martes a las 20:00 en
 * Lima —miércoles 01:00 UTC— aparecía como del miércoles.
 *
 * Sin `createdAt` devuelve cadena vacía. Antes devolvía `hoyISO()`, de modo que
 * una plantilla sin fecha se mostraba como creada hoy; el catálogo ya sabe
 * mostrar «—» cuando no hay fecha.
 */
const formatFechaCreacion = (iso: string): string => (iso ? aFechaISOLocal(iso) : '');

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
  anioAcademico: p.anioAcademico,
  baremo: p.baremo as Baremo,
  niveles: (p.niveles ?? []).map(mapNivel),
  desempenos: (p.desempenos ?? []).map(mapDesempeno),
  ejesItems: (p.ejesItems ?? []).map(mapEjeItem),
  fechaCreacion: formatFechaCreacion(p.createdAt),
  estado: p.estado as EstadoPlantilla,
  descripcion: p.descripcion ?? '',
  creadoPorRole: p.rolAutorAlCrear as RolAutorPlantilla,
  creadoPorId: p.autorId,
  ieId: p.institucionId ?? undefined,
  institucionNombre: p.institucion?.nombre,
});

export const mapIPlantillaListToPlantillaList = (list: IPlantilla[]): Plantilla[] =>
  (list ?? []).map(mapIPlantillaToPlantilla);

export const NIVEL_ROMANOS: readonly NivelRomano[] = ['I', 'II', 'III', 'IV'] as const;
