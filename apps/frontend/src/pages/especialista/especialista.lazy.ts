import { lazy } from 'react';

/**
 * Páginas del especialista, cargadas bajo demanda.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Viven aparte del manifiesto de rutas porque
 * `react-refresh/only-export-components` exige que un archivo no mezcle
 * declaraciones de componente con exportaciones que no lo son —y un manifiesto
 * de rutas es, por definición, lo segundo—. Separarlos permite retirar la
 * supresión en lugar de convivir con ella.
 */
export const ReportesMonitoreoPage = lazy(() =>
  import('./ReportesMonitoreoPage').then((m) => ({ default: m.ReportesMonitoreoPage })),
);
