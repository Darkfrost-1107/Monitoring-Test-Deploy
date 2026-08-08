import type { Cronograma } from '@entities/model-cronogramas';

/**
 * Formulario de programación de una visita de monitoreo.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Doce `useState` sueltos y su validación
 * vivían dentro de `CronogramaPage`, un componente de 1.446 líneas. La regla de
 * fecha compara contra el reloj del sistema y no tenía cobertura, que es
 * exactamente donde se esconden los errores de borde.
 *
 * ── Identificadores, no nombres ──
 * Los tres campos de asignación guardan el identificador de la entidad. Antes
 * guardaban el nombre visible y se traducía al guardar, comparando cadenas: con
 * tres nombres de institución repetidos en la base, esa traducción devolvía
 * siempre la primera coincidencia.
 */

/** Hora a la que se propone la visita cuando se abre el formulario. */
const HORA_POR_DEFECTO = 8;

export interface FormularioCronograma {
  fechaHora: string;
  /** Especialista asignado. Identificador, no nombre: hay homónimos. */
  monitorId: string;
  /**
   * Institución de la visita. Identificador, no nombre: en la base hay tres
   * nombres repetidos, uno de ellos cinco veces.
   */
  institucionId: string;
  /** Persona a la que se evalúa. Identificador, no nombre. */
  evaluadoId: string;
  tipo: 'DOCENTE' | 'DIRECTIVO';
  visita: string;
  estado: Cronograma['estado'];
  modalidad: string;
  nivel: string;
  observaciones: string;
}

export const FORMULARIO_CRONOGRAMA_VACIO: FormularioCronograma = {
  fechaHora: '',
  monitorId: '',
  institucionId: '',
  evaluadoId: '',
  tipo: 'DOCENTE',
  visita: '01',
  estado: 'PROGRAMADO',
  modalidad: '',
  nivel: '',
  observaciones: '',
};

/** Campos que quedan sin sentido al cambiar cada eslabón de la cascada. */
const DEPENDIENTES: Partial<Record<keyof FormularioCronograma, (keyof FormularioCronograma)[]>> = {
  modalidad: ['nivel', 'monitorId', 'institucionId'],
  nivel: ['monitorId', 'institucionId'],
  // El evaluado se elige de una institución concreta, y la lista difiere según
  // se evalúe a un docente o a un directivo.
  institucionId: ['evaluadoId'],
  tipo: ['evaluadoId'],
};

/**
 * Aplica un cambio limpiando lo que deja de ser válido.
 *
 * La cascada es modalidad → nivel → especialista e institución: las opciones de
 * cada eslabón se calculan con el anterior, de modo que conservar la selección
 * dejaría elegido a alguien que ya no figura entre las opciones ofrecidas.
 */
export function aplicarCambioDeAsignacion<K extends keyof FormularioCronograma>(
  formulario: FormularioCronograma,
  campo: K,
  valor: FormularioCronograma[K],
): FormularioCronograma {
  const limpiados = Object.fromEntries(
    (DEPENDIENTES[campo] ?? []).map((dependiente) => [dependiente, '']),
  );

  return { ...formulario, [campo]: valor, ...limpiados };
}

/** Fecha propuesta al abrir el formulario: mañana a primera hora. */
export function fechaProgramadaPorDefecto(ahora: Date = new Date()): string {
  const propuesta = new Date(ahora);
  propuesta.setDate(propuesta.getDate() + 1);

  const anio = propuesta.getFullYear();
  const mes = String(propuesta.getMonth() + 1).padStart(2, '0');
  const dia = String(propuesta.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}T${String(HORA_POR_DEFECTO).padStart(2, '0')}:00`;
}

interface OpcionesDeValidacion {
  /**
   * Al editar no se revalida la fecha: una visita ya programada que quedó en el
   * pasado debe poder corregirse en sus otros campos sin reprogramarla.
   */
  esEdicion: boolean;
  ahora?: Date;
}

/** Devuelve el mensaje de la primera falta, o `null` si se puede guardar. */
export function validarProgramacion(
  formulario: FormularioCronograma,
  { esEdicion, ahora = new Date() }: OpcionesDeValidacion,
): string | null {
  const faltaAlguno =
    !formulario.modalidad ||
    !formulario.nivel ||
    !formulario.monitorId ||
    !formulario.institucionId ||
    !formulario.evaluadoId ||
    !formulario.fechaHora;

  if (faltaAlguno) {
    return 'Todos los campos con asterisco (*) son obligatorios.';
  }

  if (esEdicion) return null;

  const [dia, hora] = formulario.fechaHora.split('T');

  const diaActual = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('-');

  if (dia < diaActual) {
    return 'La fecha programada no puede ser anterior a la fecha actual.';
  }

  if (dia === diaActual) {
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(
      ahora.getMinutes(),
    ).padStart(2, '0')}`;

    if (hora < horaActual) {
      return 'La hora programada no puede ser anterior a la hora actual.';
    }
  }

  return null;
}
