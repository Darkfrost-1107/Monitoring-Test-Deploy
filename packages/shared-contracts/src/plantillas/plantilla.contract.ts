export type TipoPlantilla = 'DOCENTE' | 'DIRECTIVO';

export type EstadoPlantilla = 'Borrador' | 'Vigente' | 'Historico';

export type NivelRomano = 'I' | 'II' | 'III' | 'IV';

export type Baremo = 'Vigente' | 'Porcentual';

export type ModoVersionado = 'IN_PLACE' | 'VERSIONADO';

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
