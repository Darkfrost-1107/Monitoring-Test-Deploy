import type { RolAutorPlantilla, TipoPlantilla } from '@sistema-monitoreo/shared-contracts';
import type { ContextoSeleccion } from './seleccion';

/**
 * Qué instrumentos se le OFRECEN al evaluador para una visita.
 *
 * Complementa a `seleccionarPlantillaActiva`, que elige uno solo por cascada de
 * prioridades. Acá se decide el conjunto entre el que la persona puede elegir a
 * mano cuando el modal le pregunta «¿qué ficha aplicarás?».
 *
 * ── Por qué el ámbito importa ──
 * Las instituciones clonan la ficha oficial de la UGEL para adaptarla. El clon
 * conserva el rótulo del original, de modo que en la lista aparece con el mismo
 * nombre. Ofrecerle a una especialista de UGEL las copias de una I.E. ajena no
 * es sólo ruido: si elige la equivocada, la ficha queda evaluada con un
 * instrumento que no corresponde y nada en pantalla lo delata.
 *
 * La regla es la misma que ya aplicaba la cascada, y por eso vive al lado: si
 * divergieran, el modal ofrecería opciones que la selección automática nunca
 * elegiría, y la pantalla se contradiría consigo misma.
 *
 * ── Se compara por `instrumento`, no por rótulo ──
 * `tipoMonitoreo` es texto que alguien escribió y que un clon copia tal cual.
 * `instrumento` es el valor tipado del contrato.
 *
 * ── Por qué el año se corta acá y no archivando plantillas ──
 * El sistema no archiva nada al cambiar de año, y hacerlo sería peor: el estado
 * `Historico` significa «esta plantilla fue versionada, migre las respuestas a
 * la vigente», no «su año terminó». Archivar en masa las del año anterior
 * marcaría toda ficha de ese año como pendiente de migrar hacia una versión que
 * ya no existiría.
 *
 * El corte va por el año de la VISITA, no por el calendario. Así una visita de
 * 2026 que se completa en febrero de 2027 se sigue evaluando con el instrumento
 * de 2026, que es el que corresponde.
 */

/** Instrumentos que admite cada tipo de visita. */
const INSTRUMENTOS_POR_VISITA: Record<
  ContextoSeleccion['tipoVisita'],
  readonly TipoPlantilla[]
> = {
  // Una visita docente admite los dos: cuál corresponde lo decide el evaluador
  // en el aula, según la sesión que observa.
  DOCENTE: ['DOCENTE', 'DOCENTE_EIB'],
  DOCENTE_EIB: ['DOCENTE', 'DOCENTE_EIB'],
  DIRECTIVO: ['DIRECTIVO'],
};

/** Campos que la decisión necesita. */
export interface PlantillaAplicable {
  id: string;
  instrumento: TipoPlantilla;
  estado: 'Vigente' | 'Borrador' | 'Historico';
  /** Año lectivo al que pertenece el instrumento. */
  anioAcademico: number;
  /** Sello histórico del autor. Ausente en plantillas anteriores al sello. */
  creadoPorRole?: RolAutorPlantilla;
  /** Institución dueña del clon. Ausente en las de la UGEL. */
  ieId?: string;
}

/** Contexto de la selección, más el año de la visita que se va a evaluar. */
export interface ContextoAplicables extends ContextoSeleccion {
  /**
   * Año lectivo de la VISITA, no el del calendario.
   *
   * Es lo que permite que una visita completada tarde conserve el instrumento
   * de su propio año.
   */
  anioVisita: number;
}

/** Una plantilla sin institución dueña es de la UGEL, con sello o sin él. */
const esDeLaUgel = (p: PlantillaAplicable) => p.ieId === undefined;

/**
 * Genérica en el tipo para devolver los mismos objetos que recibe: acá sólo se
 * leen los campos de `PlantillaAplicable`, pero quien llama necesita la
 * plantilla completa para renderizarla.
 */
export function plantillasAplicables<T extends PlantillaAplicable>(
  plantillas: readonly T[],
  contexto: ContextoAplicables,
): T[] {
  const admitidos = INSTRUMENTOS_POR_VISITA[contexto.tipoVisita];

  const enAmbito = (p: T): boolean => {
    if (esDeLaUgel(p)) return true;
    // Un clon sólo se ofrece a quien pertenece a la institución que lo creó.
    return contexto.esInstitucion && p.ieId === contexto.institucionUsuarioId;
  };

  return plantillas
    .filter(
      (p) =>
        p.estado === 'Vigente' &&
        p.anioAcademico === contexto.anioVisita &&
        admitidos.includes(p.instrumento) &&
        enAmbito(p),
    )
    // Los de la UGEL primero: son los que aplican por defecto, y el orden de la
    // lista es lo primero que lee quien elige con el aula esperando.
    .sort((a, b) => Number(esDeLaUgel(b)) - Number(esDeLaUgel(a)));
}
