/**
 * Manejo de fechas del sistema.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-17. El proyecto formateaba fechas
 * segmentando cadenas a mano en treinta archivos, con `try/catch` que devolvían
 * cualquier cosa cuando el análisis fallaba —uno de ellos, un mes y un año
 * escritos a mano—. Un error de formato terminaba mostrándose como un dato
 * correcto.
 *
 * ── El defecto de fondo ──
 * `new Date('2026-03-09')` interpreta la forma corta como medianoche **UTC**.
 * En Perú (UTC-5) eso cae el 8 de marzo a las 19:00, de modo que la fecha se
 * mostraba un día antes. No hace falta una biblioteca para arreglarlo: alcanza
 * con construir la fecha a partir de sus componentes, que es lo que hace
 * `aFechaLocal`.
 *
 * ── Sin repliegue silencioso ──
 * Una fecha ilegible se informa como tal. Devolver la cadena original —o un
 * valor inventado— deja al usuario mirando algo incorrecto sin saberlo.
 */

/** Lo que se muestra cuando una fecha no se puede interpretar. */
export const FECHA_INVALIDA = 'Fecha inválida';

const ISO_CORTA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_CON_HORA = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Construye la fecha en horario local, sin pasar por el análisis de cadenas del
 * constructor.
 *
 * Comprueba además que la fecha exista: `new Date(2026, 1, 31)` no falla, se
 * desborda al 3 de marzo. Un 31 de febrero es un dato equivocado, no una fecha
 * de marzo.
 */
const construir = (
  anio: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
): Date | null => {
  const fecha = new Date(anio, mes - 1, dia, hora, minuto, segundo);

  const seDesbordo =
    fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia;

  return seDesbordo ? null : fecha;
};

/**
 * Interpreta una fecha del sistema en horario local.
 *
 * Devuelve `null` si el valor no es una fecha, en lugar de una `Date` inválida
 * que se propaga sin avisar.
 */
export function aFechaLocal(valor: string | null | undefined): Date | null {
  if (!valor) return null;

  const corta = ISO_CORTA.exec(valor);
  if (corta) {
    return construir(Number(corta[1]), Number(corta[2]), Number(corta[3]));
  }

  const conHora = ISO_CON_HORA.exec(valor);
  if (conHora) {
    return construir(
      Number(conHora[1]),
      Number(conHora[2]),
      Number(conHora[3]),
      Number(conHora[4]),
      Number(conHora[5]),
      Number(conHora[6] ?? 0),
    );
  }

  // Formatos que no reconocemos —incluido el ISO con zona explícita— se dejan
  // al constructor, que sí sabe leerlos.
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

/** ¿El valor se puede interpretar como fecha? */
export const esFechaValida = (valor: string | null | undefined): boolean =>
  aFechaLocal(valor) !== null;

/**
 * Separa el día de la hora de una cadena ISO.
 *
 * La hora se recorta a `HH:MM` porque es lo que editan los campos
 * `datetime-local` del sistema; los segundos los agrega la capa de envío.
 */
export function partesDeFechaHora(valor: string): { dia: string; hora: string } {
  const [dia = '', horaCompleta = ''] = valor.split('T');
  return { dia, hora: horaCompleta.slice(0, 5) };
}

const DOS_DIGITOS = (n: number) => String(n).padStart(2, '0');

/** Fecha en formato peruano: `09/03/2026`. */
export function formatearFechaCorta(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  return `${DOS_DIGITOS(fecha.getDate())}/${DOS_DIGITOS(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/** Hora en formato de 12 horas: `2:30 PM`. */
function formatearHora(fecha: Date): string {
  const hora = fecha.getHours();
  const meridiano = hora >= 12 ? 'PM' : 'AM';
  // El resto de 12 da 0 tanto a medianoche como al mediodía; ambas se muestran
  // como 12, no como 0.
  return `${hora % 12 || 12}:${DOS_DIGITOS(fecha.getMinutes())} ${meridiano}`;
}

const NOMBRES_DE_MES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Día, mes en palabras y hora en 24 horas: `9 de Marzo, 14:30 hrs`.
 *
 * Es el formato de las tarjetas de reprogramación. Su versión anterior tenía un
 * respaldo que devolvía el mes y el año escritos a mano —«Oct 2023»— cuando la
 * fecha no se podía leer: una fecha ilegible se mostraba como octubre de 2023.
 */
export function formatearFechaConMes(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  const mes = NOMBRES_DE_MES[fecha.getMonth()];
  return `${fecha.getDate()} de ${mes}, ${fecha.getHours()}:${DOS_DIGITOS(fecha.getMinutes())} hrs`;
}

/** Fecha y hora juntas: `09/03/2026, 2:30 PM`. */
export function formatearFechaHora(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  return `${formatearFechaCorta(valor, siNoEsFecha)}, ${formatearHora(fecha)}`;
}
