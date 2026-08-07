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
/** Sin zona al final: la cadena describe un horario local, no un instante. */
const ISO_SIN_ZONA = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

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

  const conHora = ISO_SIN_ZONA.exec(valor);
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

  // Con zona explícita —`Z` o `±HH:MM`— la cadena describe un INSTANTE, no un
  // horario local: convertirlo es justamente el trabajo del constructor.
  // Tratarlo como local desplazaría la fecha en cinco horas.
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

/**
 * Formato libre, con interpretación segura de la fecha.
 *
 * Para los formatos de una sola pantalla, que no justifican una función con
 * nombre propio. Lo que aporta sobre llamar a `toLocaleDateString` directo es
 * lo mismo que el resto del módulo: la fecha se interpreta sin corrimiento de
 * zona, y una que no se puede leer se informa en lugar de mostrarse mal.
 */
export function formatearFecha(
  valor: string | null | undefined,
  opciones: Intl.DateTimeFormatOptions,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  return fecha ? fecha.toLocaleDateString('es-PE', opciones) : siNoEsFecha;
}

/** Fecha en formato peruano: `09/03/2026`. */
export function formatearFechaCorta(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  return `${DOS_DIGITOS(fecha.getDate())}/${DOS_DIGITOS(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/**
 * Fecha en formato `YYYY-MM-DD`, en horario **local**.
 *
 * Reemplaza a `new Date(x).toISOString().split('T')[0]`, que estaba en tres
 * servicios y devolvía la fecha en UTC: en Perú (UTC-5), todo lo registrado
 * después de las 19:00 aparecía con la fecha del día siguiente. Un cargo
 * asignado un martes a las 20:00 se mostraba como del miércoles.
 */
export function aFechaISOLocal(valor: string | Date | null | undefined): string {
  const fecha = valor instanceof Date ? valor : aFechaLocal(valor);
  if (!fecha || isNaN(fecha.getTime())) return '';

  return `${fecha.getFullYear()}-${DOS_DIGITOS(fecha.getMonth() + 1)}-${DOS_DIGITOS(fecha.getDate())}`;
}

/**
 * Hoy, en formato `YYYY-MM-DD` y en horario local.
 *
 * Reemplaza a `new Date().toISOString().split('T')[0]`, que devuelve el día en
 * UTC: en Perú, después de las 19:00 daba el día siguiente. Finalizar un cargo
 * a las 20:00 lo registraba con la fecha de mañana.
 */
export const hoyISO = (ahora: Date = new Date()): string => aFechaISOLocal(ahora);

/** Hora en formato de 12 horas a partir de una `Date` ya resuelta. */
function formatearSoloHora(fecha: Date): string {
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
 * Día, mes abreviado y año: `09 Mar 2026`.
 *
 * Es el formato del catálogo de plantillas, donde estaba escrito a mano
 * partiendo la cadena por los guiones, con su propia lista de meses y un
 * `try/catch` que devolvía la cadena original. Si el valor traía hora, el
 * último segmento salía sin cortar: `09T00:00:00.000Z Mar 2026`.
 */
export function formatearFechaAbreviada(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  const mes = NOMBRES_DE_MES[fecha.getMonth()].slice(0, 3);
  return `${DOS_DIGITOS(fecha.getDate())} ${mes} ${fecha.getFullYear()}`;
}

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

/**
 * Día, mes en palabras y año: `9 de Marzo, 2026`.
 *
 * Es el formato de los reportes y de la ficha imprimible. Estaba escrito tres
 * veces —una de ellas con su propia copia de los nombres de mes dentro de la
 * función— y las tres con un `try/catch` que devolvía la cadena original.
 */
export function formatearFechaEnPalabras(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  return `${fecha.getDate()} de ${NOMBRES_DE_MES[fecha.getMonth()]}, ${fecha.getFullYear()}`;
}

/**
 * Fecha en palabras con el día de la semana: `Lunes, 9 de marzo de 2026`.
 *
 * Venía de `shared/lib/fecha-visita.ts`, que la Fase 5 creó y la Fase 6
 * duplicó sin querer con este módulo. Se consolidan acá.
 */
export function formatearFechaLarga(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  const texto = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Hora sola, en formato de 12 horas: `2:30 PM`. */
export function formatearHora(valor: string | null | undefined, siNoEsFecha = FECHA_INVALIDA): string {
  const fecha = aFechaLocal(valor);
  return fecha ? formatearSoloHora(fecha) : siNoEsFecha;
}

/** Fecha y hora juntas: `09/03/2026, 2:30 PM`. */
export function formatearFechaHora(
  valor: string | null | undefined,
  siNoEsFecha = FECHA_INVALIDA,
): string {
  const fecha = aFechaLocal(valor);
  if (!fecha) return siNoEsFecha;

  return `${formatearFechaCorta(valor, siNoEsFecha)}, ${formatearSoloHora(fecha)}`;
}
