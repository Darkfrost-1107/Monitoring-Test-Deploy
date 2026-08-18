import type { RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
// Plantilla de Monitoreo (la registra el Jefe de Gestión).

// Baremo de calificación: Vigente = escala 0-20; Porcentual = %.
export type Baremo = 'Vigente' | 'Porcentual';

export type NivelRomano = 'I' | 'II' | 'III' | 'IV';

// Un nivel de la escala de calificación (cabecera de la plantilla).
export interface NivelCalificacion {
  nivel: NivelRomano;
  denominacion: string; // Ej. "Satisfactorio"
  rangoMin: number; // corte mínimo del nivel
  color: string; // hex
}

// Un aspecto evaluado dentro de un desempeño (checklist).
export interface AspectoEvaluado {
  id: string;
  descripcion: string;
}

// Descripción de la rúbrica para un nivel dado.
export interface RubricaNivel {
  nivel: NivelRomano;
  descripcion: string;
}

// Un Eje/Item evaluado dentro de la plantilla (Solo Docente).
export interface EjeItem {
  id: string;
  numero: number;
  descripcion: string;
}

// Un desempeño de la plantilla.
export interface Desempeno {
  id: string;
  nombre: string;
  descripcionCorta: string;
  preguntaExtra?: string;
  aspectos: AspectoEvaluado[];
  rubrica: RubricaNivel[]; // una entrada por nivel (I-IV)
}

// La plantilla de monitoreo completa.
export interface Plantilla {
  id: string;
  /** Rótulo del formulario. Ej. "Monitoreo Docente". Para comparar, usar `instrumento`. */
  tipoMonitoreo: string;
  /**
   * El instrumento, tal como lo declara el contrato.
   *
   * `tipoMonitoreo` guarda el RÓTULO y es lo que la pantalla muestra; este es
   * el VALOR y es con lo que se compara. Tenerlos separados evita deducir el
   * instrumento con `includes('EIB')` sobre el rótulo.
   */
  instrumento: import('@sistema-monitoreo/shared-contracts').TipoPlantilla;
  anioAcademico: number;
  /**
   * Lema oficial del `anioAcademico`, resuelto por el servidor.
   *
   * Viaja con la plantilla para que la ficha impresa no necesite una consulta
   * aparte. Nulo mientras el año no tenga lema cargado.
   */
  lema: string | null;
  baremo: Baremo;
  niveles: NivelCalificacion[]; // los 4 niveles de la escala
  desempenos: Desempeno[];
  ejesItems?: EjeItem[];
  fechaCreacion: string;
  /**
   * Día de la última modificación del registro.
   *
   * Rastro de las ediciones que se aplican sobre la misma fila: cuando la
   * plantilla no tiene fichas asociadas, `plantilla.service.ts` la actualiza
   * in-place y ni la versión ni la fecha de registro cambian. Vacío si el
   * servidor no manda `updatedAt`.
   */
  fechaActualizacion: string;
  /** Sube cuando una edición versiona por tener fichas asociadas. */
  version: number;
  estado: 'Vigente' | 'Borrador' | 'Historico';
  descripcion: string;
  /** Se tipa contra el contrato: la unión escrita a mano quedó corta al sumar
   *  los dos actores nuevos de la institución. */
  creadoPorRole?: RolAutorPlantilla;
  creadoPorId?: string;
  /** Nombre de quien la creó. Ausente en las plantillas anteriores al campo. */
  autorNombre?: string;
  ieId?: string;
  institucionNombre?: string;
}
