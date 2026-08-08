import type { Opcion } from '@features/cronogramas/lib/opciones-de-asignacion';
import type { BotonVisita } from './SelectorNumeroVisita';

/**
 * Lo que el modal de programación necesita saber para dibujarse.
 *
 * Vive aparte de los componentes porque son tipos y valores, no maquetación:
 * dejarlos en el archivo del componente rompe la recarga en caliente.
 */

/** Todo lo que el formulario puede ofrecer, ya filtrado por la cascada. */
export interface OpcionesDelFormulario {
  modalidades: string[];
  niveles: string[];
  especialistas: Opcion[];
  instituciones: Opcion[];
  evaluados: Opcion[];
  evaluadores: Opcion[];
  visitas: BotonVisita[];
}

/** Qué puede editar quien está usando el formulario. */
export interface PerfilDelFormulario {
  /** El director trabaja en un solo colegio: no elige modalidad ni institución. */
  esDirector: boolean;
  /** Sólo en Secundaria existen los cargos que pueden evaluar además del director. */
  esSecundaria: boolean;
  /** Coordinador o jefe de taller: se evalúa a sí mismo, no elige evaluador. */
  esCoordinadorOTaller: boolean;
}

/**
 * La etiqueta de la opción elegida, o un guion si todavía no hay ninguna.
 *
 * El formulario guarda identificadores; los campos de sólo lectura necesitan
 * el nombre, y enseñar un UUID no le dice nada a nadie.
 */
export const etiquetaDe = (opciones: readonly Opcion[], valor: string): string =>
  opciones.find((o) => o.value === valor)?.label ?? '—';
