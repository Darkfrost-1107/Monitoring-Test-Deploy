/**
 * Construcción de las cuadrículas del calendario.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Estas funciones vivían dentro de
 * `CalendarioGrid.tsx`, un componente de 1.086 líneas, envueltas en `useMemo` y
 * por tanto imposibles de probar sin renderizar. No dependen de React: sólo de
 * aritmética de fechas.
 *
 * Se extraen sin alterar el cuerpo del cálculo. Aquí es donde viven los errores
 * que no se ven —cruces de año, meses que empiezan en domingo, febrero
 * bisiesto— y ninguno estaba verificado.
 *
 * La Fase 5 descompone el componente; estas funciones y sus pruebas sobreviven a
 * esa descomposición porque no dependen de cómo esté organizada la interfaz.
 */

/** Etiquetas de los días de la semana, de domingo a sábado. */
export const WEEK_DAYS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'] as const;

/**
 * Total de celdas de la cuadrícula mensual: seis semanas completas.
 *
 * Es fijo a propósito. Un mes ocupa entre cuatro y seis filas según en qué día
 * caiga el primero, y mantener el alto constante evita que la interfaz salte al
 * cambiar de mes.
 */
export const CELDAS_CUADRICULA_MENSUAL = 42;

export interface CeldaCalendario {
  dayNumber: number;
  /** Fecha en formato `YYYY-MM-DD`, la clave con la que se cruzan las visitas. */
  dateStr: string;
  isCurrentMonth: boolean;
  date: Date;
}

export interface DiaSemana {
  name: string;
  dayNumber: number;
  dateStr: string;
  date: Date;
}

/** Formatea una fecha como `YYYY-MM-DD` en horario local, no UTC. */
export const formatearFechaClave = (anio: number, mesIndice: number, dia: number): string =>
  `${anio}-${String(mesIndice + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/**
 * Celdas de la cuadrícula mensual, rellenando con los días contiguos del mes
 * anterior y del siguiente hasta completar las seis semanas.
 *
 * Las fechas se construyen al mediodía para que un cambio de horario de verano
 * no desplace el día.
 */
export function construirCuadriculaMensual(anio: number, mesIndice: number): CeldaCalendario[] {
  const cells: CeldaCalendario[] = [];
  const firstDayOfMonth = new Date(anio, mesIndice, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDaysInMonth = new Date(anio, mesIndice + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(anio, mesIndice, 0).getDate();

  // 1. Días del mes anterior
  for (let i = startDayOfWeek; i > 0; i--) {
    const dayNum = totalDaysInPrevMonth - i + 1;
    const prevMonthYear = mesIndice === 0 ? anio - 1 : anio;
    const prevMonthIdx = mesIndice === 0 ? 11 : mesIndice - 1;

    cells.push({
      dayNumber: dayNum,
      dateStr: formatearFechaClave(prevMonthYear, prevMonthIdx, dayNum),
      isCurrentMonth: false,
      date: new Date(prevMonthYear, prevMonthIdx, dayNum, 12),
    });
  }

  // 2. Días del mes actual
  for (let i = 1; i <= totalDaysInMonth; i++) {
    cells.push({
      dayNumber: i,
      dateStr: formatearFechaClave(anio, mesIndice, i),
      isCurrentMonth: true,
      date: new Date(anio, mesIndice, i, 12),
    });
  }

  // 3. Días del mes siguiente
  const remainingCells = CELDAS_CUADRICULA_MENSUAL - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthYear = mesIndice === 11 ? anio + 1 : anio;
    const nextMonthIdx = mesIndice === 11 ? 0 : mesIndice + 1;

    cells.push({
      dayNumber: i,
      dateStr: formatearFechaClave(nextMonthYear, nextMonthIdx, i),
      isCurrentMonth: false,
      date: new Date(nextMonthYear, nextMonthIdx, i, 12),
    });
  }

  return cells;
}

/**
 * Los siete días de la semana que contiene la fecha indicada, empezando en
 * domingo.
 *
 * No altera la fecha recibida.
 */
export function construirSemana(fecha: Date): DiaSemana[] {
  const baseDate = new Date(fecha);
  const dayOfWeek = baseDate.getDay();
  const diff = baseDate.getDate() - dayOfWeek;
  const startOfWeek = new Date(baseDate.setDate(diff));

  const days: DiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);

    days.push({
      name: WEEK_DAYS[i],
      dayNumber: day.getDate(),
      dateStr: formatearFechaClave(day.getFullYear(), day.getMonth(), day.getDate()),
      date: day,
    });
  }
  return days;
}

/** Clave `YYYY-MM-DD` del día de hoy según el reloj del sistema. */
export function claveDeHoy(hoy: Date = new Date()): string {
  return formatearFechaClave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}
