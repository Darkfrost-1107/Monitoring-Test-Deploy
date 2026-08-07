/**
 * Navegación entre períodos del calendario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `getLabelForHeader`, `handlePrev` y
 * `handleNext` vivían dentro de `CalendarioGrid`. Los dos manejadores tenían el
 * mismo cuerpo salvo el signo del salto, y el formato `YYYY-MM-DD` estaba
 * escrito a mano tres veces existiendo ya `formatearFechaClave`.
 *
 * Es aritmética de fechas sin dependencia de React: acá sí puede probarse, que
 * es donde importan los cruces de mes y de año.
 */

export const VISTAS_CALENDARIO = ['MENSUAL', 'SEMANAL', 'DIARIO', 'ANUAL', 'LISTA'] as const;

export type VistaCalendario = (typeof VISTAS_CALENDARIO)[number];

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

/** Domingo de la semana que contiene la fecha dada. */
const inicioDeSemana = (fecha: Date): Date => {
  const inicio = new Date(fecha);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return inicio;
};

/**
 * Rótulo del período visible.
 *
 * El año que se imprime es el de la fecha de referencia. En una semana que
 * cruza el 31 de diciembre eso rotula ambos extremos con el año viejo; está
 * fijado en `navegacion.test.ts` como defecto conocido.
 */
export function etiquetaDePeriodo(fecha: Date, vista: VistaCalendario): string {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const etiquetaMensual = `${NOMBRES_DE_MES[mes]} ${anio}`;

  if (vista === 'DIARIO') {
    return `${fecha.getDate()} de ${etiquetaMensual}`;
  }

  if (vista === 'SEMANAL') {
    const inicio = inicioDeSemana(fecha);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);

    if (inicio.getMonth() === fin.getMonth()) {
      return `${inicio.getDate()} - ${fin.getDate()} de ${NOMBRES_DE_MES[inicio.getMonth()]} ${anio}`;
    }
    return `${inicio.getDate()} de ${NOMBRES_DE_MES[inicio.getMonth()]} - ${fin.getDate()} de ${NOMBRES_DE_MES[fin.getMonth()]} ${anio}`;
  }

  // Mensual, anual y lista comparten rótulo: las tres se sitúan en un mes.
  return etiquetaMensual;
}

/**
 * Desplaza la fecha de referencia un período en la dirección indicada.
 *
 * `paso` es 1 hacia adelante y -1 hacia atrás. La vista de lista no navega:
 * muestra todas las visitas y no está situada en ningún período.
 *
 * El salto mensual usa `setMonth`, que conserva el día y por tanto se desborda
 * desde un día 31 hacia un mes más corto. Está fijado como defecto conocido.
 */
export function desplazarPeriodo(fecha: Date, vista: VistaCalendario, paso: 1 | -1): Date {
  const destino = new Date(fecha);

  if (vista === 'MENSUAL' || vista === 'ANUAL') {
    destino.setMonth(fecha.getMonth() + paso);
  } else if (vista === 'SEMANAL') {
    destino.setDate(fecha.getDate() + 7 * paso);
  } else if (vista === 'DIARIO') {
    destino.setDate(fecha.getDate() + paso);
  }

  return destino;
}

/**
 * ¿Navegar en esta vista debe mover también el día seleccionado?
 *
 * Sólo en la vista diaria: ahí el período visible *es* un día, de modo que
 * cambiarlo sin mover la selección dejaría el panel de detalle mostrando otro
 * día que el que se está viendo. En las demás vistas el usuario elige el día
 * aparte.
 */
export const sincronizaDiaSeleccionado = (vista: VistaCalendario): boolean => vista === 'DIARIO';
