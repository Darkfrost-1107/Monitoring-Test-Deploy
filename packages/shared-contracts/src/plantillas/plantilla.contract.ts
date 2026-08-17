export type TipoPlantilla = 'DOCENTE' | 'DIRECTIVO' | 'DOCENTE_EIB';

export type EstadoPlantilla = 'Borrador' | 'Vigente' | 'Historico';

export type NivelRomano = 'I' | 'II' | 'III' | 'IV';

export type Baremo = 'Vigente' | 'Porcentual';

export type ModoVersionado = 'IN_PLACE' | 'VERSIONADO';

/**
 * Cuántas valoraciones declara la escala de cada instrumento.
 *
 * ── Por qué no son cuatro siempre ──
 * Las rúbricas docente y directiva puntúan de I a IV. La Ficha Docente EIB no
 * puntúa: es una **lista de cotejo de tres valores** —No, Parcialmente, Sí—.
 *
 * Hasta ahora el sistema exigía cuatro niveles en cinco lugares distintos: el
 * zod del formulario, los dos DTO de plantillas y las dos reglas de
 * `validarReglas` (niveles y rúbrica de cada desempeño). La plantilla EIB no
 * podía guardarse con tres, así que se le agregó un cuarto nivel inventado
 * —«Destacado»— y una entrada de rúbrica que duplicaba «Sí».
 *
 * Ese relleno nunca fue visible ni editable: el editor de escala para EIB
 * muestra tres filas fijas y la pantalla de calificación ofrece tres botones.
 * Era un nivel que existía sólo para satisfacer a los validadores y que después
 * había que filtrar en cada consolidado para que no apareciera con 0 ítems.
 *
 * De ahí que la cantidad se declare acá, del lado del contrato: es el único
 * lugar que el backend y el frontend comparten, y las cinco validaciones ahora
 * preguntan en vez de asumir.
 */
export const VALORACIONES_POR_TIPO: Record<TipoPlantilla, number> = {
  DOCENTE: 4,
  DIRECTIVO: 4,
  DOCENTE_EIB: 3,
};

/** Los cuatro niveles romanos, en orden. El frontend tiene su propia copia. */
const ROMANOS: readonly NivelRomano[] = ['I', 'II', 'III', 'IV'] as const;

/**
 * A quién se monitorea con este instrumento.
 *
 * El instrumento determina el tipo de visita sin ambigüedad: la ficha docente
 * regular y la EIB son las dos de un monitoreo docente. Vive en el contrato
 * porque la relación entre `TipoPlantilla` y `TipoMonitoreo` es del dominio, y
 * la consultan los dos lados —el backend al validar qué plantilla sirve para una
 * visita, el frontend al presentar las filas de reportes—.
 */
export function tipoDeVisitaDe(instrumento: TipoPlantilla | undefined): 'DOCENTE' | 'DIRECTIVO' {
  return instrumento === 'DIRECTIVO' ? 'DIRECTIVO' : 'DOCENTE';
}

/** Cuántas valoraciones declara la escala de este instrumento. */
export function valoracionesDe(tipo: TipoPlantilla): number {
  return VALORACIONES_POR_TIPO[tipo] ?? ROMANOS.length;
}

/**
 * Los niveles romanos que este instrumento puede otorgar, en orden.
 *
 * Para la EIB son I, II y III: el IV no es una valoración de la lista de cotejo.
 */
export function nivelesRomanosDe(tipo: TipoPlantilla): NivelRomano[] {
  return ROMANOS.slice(0, valoracionesDe(tipo));
}

/**
 * Quién es dueño de la plantilla.
 *
 * Cada actor usa la suya al monitorear: el Jefe de Gestión crea la de la UGEL,
 * el Director de I.E. la clona y la adapta, y el Jefe de Taller y el Coordinador
 * Pedagógico clonan la del Director. Los tres de la institución compartían el
 * valor `director_ie`, de modo que la regla de una sola vigente por autor los
 * tomaba por uno solo y sólo el primero podía activar la suya.
 */
export const ROLES_AUTOR_PLANTILLA = [
  'jefe_gestion',
  'director_ie',
  'coordinador_pedagogico',
  'jefe_taller',
] as const;

export type RolAutorPlantilla = (typeof ROLES_AUTOR_PLANTILLA)[number];

export interface INivelCalificacion {
  id: string;
  plantillaId: string;
  nivelRomano: NivelRomano;
  denominacion: string;
  rangoMin: number;
  color: string;
  orden: number;
}

export interface IAspecto {
  id: string;
  desempenoId: string;
  descripcion: string;
  orden: number;
}

export interface IRubricaNivel {
  id: string;
  desempenoId: string;
  nivelCalificacionId: string;
  nivelRomano: NivelRomano;
  descripcion: string;
}

export interface IEjeItem {
  id: string;
  plantillaId: string;
  numero: number;
  descripcion: string;
  orden: number;
}

export interface IDesempeno {
  id: string;
  plantillaId: string;
  nombre: string;
  descripcionCorta: string | null;
  preguntaExtra: string | null;
  orden: number;
  aspectos: IAspecto[];
  rubrica: IRubricaNivel[];
}

export interface IPlantilla {
  id: string;
  tipoMonitoreo: TipoPlantilla;
  anioAcademico: number;
  version: number;
  baremo: Baremo;
  descripcion: string | null;
  estado: EstadoPlantilla;
  autorId: string;
  /**
   * Nombre de quien creó la plantilla, resuelto por el servidor.
   *
   * Derivado de la persona detrás del `autorId`: el catálogo mostraba sólo el
   * nombre de la institución, y desde que cada actor tiene su propia plantilla
   * eso deja tres tarjetas indistinguibles. Ausente en respuestas anteriores a
   * este campo.
   */
  autorNombre?: string;
  rolAutorAlCrear: RolAutorPlantilla;
  institucionId: string | null;
  niveles: INivelCalificacion[];
  desempenos: IDesempeno[];
  ejesItems: IEjeItem[];
  createdAt: string;
  updatedAt: string;
  institucion?: {
    nombre: string;
    codigoModular: string;
  };
  /**
   * Lema oficial del `anioAcademico`, resuelto por el servidor.
   *
   * Derivado, no almacenado en la plantilla: vive una sola vez por año en
   * `lemas_anuales`. Viaja acá para que la ficha impresa no necesite una
   * consulta aparte. Nulo mientras el año no tenga lema cargado.
   */
  lema: string | null;
}

export interface ICreatePlantillaRequest {
  tipoMonitoreo: TipoPlantilla;
  anioAcademico: number;
  baremo: Baremo;
  descripcion?: string;
  niveles: Omit<INivelCalificacion, 'id' | 'plantillaId'>[];
  desempenos: {
    id: string;
    nombre: string;
    descripcionCorta?: string;
    preguntaExtra?: string;
    orden: number;
    aspectos: { id: string; descripcion: string; orden: number }[];
    rubrica: {
      nivelCalificacionId: string;
      nivelRomano: NivelRomano;
      descripcion: string;
    }[];
  }[];
  ejeItems?: { numero: number; descripcion: string }[];
}

export interface IUpdatePlantillaRequest {
  baremo?: Baremo;
  descripcion?: string;
  niveles?: Omit<INivelCalificacion, 'id' | 'plantillaId'>[];
  desempenos?: {
    id: string;
    nombre: string;
    descripcionCorta?: string;
    preguntaExtra?: string;
    orden: number;
    aspectos: { id: string; descripcion: string; orden: number }[];
    rubrica: {
      nivelCalificacionId: string;
      nivelRomano: NivelRomano;
      descripcion: string;
    }[];
  }[];
  ejeItems?: { numero: number; descripcion: string }[];
}

export interface IUpdatePlantillaResponse {
  id: string;
  version: number;
  modo: ModoVersionado;
  mensaje: string;
  plantilla: IPlantilla;
}

export interface IPatchEstadoPlantillaRequest {
  estado: EstadoPlantilla;
}

export interface IDuplicatePlantillaRequest {
  descripcion?: string;
}

export interface IQueryPlantillas {
  tipoMonitoreo?: TipoPlantilla;
  anioAcademico?: number;
  estado?: EstadoPlantilla;
  soloVigentes?: boolean;
}
