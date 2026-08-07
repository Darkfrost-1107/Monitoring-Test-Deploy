import { lazy } from 'react';

/**
 * Páginas de director de UGEL, cargadas bajo demanda.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Viven aparte del manifiesto de rutas porque
 * `react-refresh/only-export-components` exige que un archivo no mezcle
 * declaraciones de componente con exportaciones que no lo son —y un manifiesto
 * de rutas es, por definición, lo segundo—. Separarlos permite retirar la
 * supresión en lugar de convivir con ella.
 */

export const DashboardEntry = lazy(() =>
  import('../DashboardEntry').then((m) => ({ default: m.DashboardEntry })),
);

export const SemaforoInstitucionalPage = lazy(() =>
  import('./SemaforoInstitucionalPage').then((m) => ({ default: m.SemaforoInstitucionalPage })),
);
