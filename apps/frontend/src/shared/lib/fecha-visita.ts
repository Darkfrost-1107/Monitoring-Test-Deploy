/**
 * Formato de fechas y horas de una visita de monitoreo.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estas conversiones estaban escritas tres
 * veces: en `CalendarioSidebar`, en `CalendarioGrid` y en `LlenarFichaForm`.
 * Viven en `shared` y no en el widget del calendario porque el formulario de
 * ficha tambien las necesita, y una feature no puede importar de un widget.
 */

/**
 * Fecha de la visita en formato peruano.
 *
 * Degrada en dos pasos antes que mostrar un error: si el valor no es una fecha
 * interpretable, se queda con lo que haya antes de la `T`; si tampoco eso sirve,
 * devuelve el valor original. Es la fecha con la que el evaluador decide si hoy
 * le toca la visita, de modo que mostrar algo imperfecto es preferible a no
 * mostrar nada.
 */
export const formatearFechaVisita = (fechaHora: string): string => {
  const fecha = new Date(fechaHora);
  if (!isNaN(fecha.getTime())) {
    return fecha.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return fechaHora.split('T')[0];
};

/** Opciones de fecha en palabras, con el día de la semana por delante. */
const FECHA_LARGA: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const conInicialMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Fecha de la visita escrita en palabras: «Lunes, 9 de marzo de 2026».
 *
 * Descompone `YYYY-MM-DD` a mano en lugar de dejárselo a `new Date(cadena)`
 * porque ese constructor interpreta la forma corta como UTC: en un huso al
 * oeste de Greenwich, el día 1 de un mes retrocedería al mes anterior.
 */
export const formatearFechaLarga = (fechaHora: string): string => {
  const [anio, mes, dia] = fechaHora.split('T')[0].split('-').map(Number);
  if (anio && mes && dia) {
    const fecha = new Date(anio, mes - 1, dia);
    if (!isNaN(fecha.getTime())) {
      return conInicialMayuscula(fecha.toLocaleDateString('es-ES', FECHA_LARGA));
    }
  }

  const fecha = new Date(fechaHora);
  if (!isNaN(fecha.getTime())) {
    return conInicialMayuscula(fecha.toLocaleDateString('es-ES', FECHA_LARGA));
  }
  return fechaHora;
};

/**
 * Hora de la visita en formato de 12 horas.
 *
 * Lee la hora directamente de la cadena ISO en lugar de construir una `Date`,
 * para que la hora mostrada sea la que se registró y no la que resulte de
 * convertir husos.
 */
export const formatearHoraVisita = (fechaHora: string): string => {
  const [, horaConSegundos] = fechaHora.split('T');
  if (horaConSegundos) {
    const [horas, minutos] = horaConSegundos.split(':');
    const hora = parseInt(horas, 10);
    const meridiano = hora >= 12 ? 'PM' : 'AM';
    // El resto de 12 da 0 tanto a medianoche como al mediodía; ambas se
    // muestran como 12, no como 0.
    return `${hora % 12 || 12}:${minutos} ${meridiano}`;
  }

  const fecha = new Date(fechaHora);
  if (!isNaN(fecha.getTime())) {
    return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return fechaHora;
};
