import { lazy } from 'react';

/**
 * Páginas de jefe de gestión, cargadas bajo demanda.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Viven aparte del manifiesto de rutas porque
 * `react-refresh/only-export-components` exige que un archivo no mezcle
 * declaraciones de componente con exportaciones que no lo son —y un manifiesto
 * de rutas es, por definición, lo segundo—. Separarlos permite retirar la
 * supresión en lugar de convivir con ella.
 */

export const PlanMonitoreoPage = lazy(() =>
  import('./PlanMonitoreoPage').then((m) => ({ default: m.PlanMonitoreoPage })),
);

export const PlanMonitoreoAnualPage = lazy(() =>
  import('./PlanMonitoreoAnualPage').then((m) => ({ default: m.PlanMonitoreoAnualPage })),
);

export const CronogramaPage = lazy(() =>
  import('./CronogramaPage').then((m) => ({ default: m.CronogramaPage })),
);

export const CalendarioPage = lazy(() =>
  import('./CalendarioPage').then((m) => ({ default: m.CalendarioPage })),
);

export const EspecialistasPage = lazy(() =>
  import('./EspecialistasPage').then((m) => ({ default: m.EspecialistasPage })),
);

export const EspecialistaCreatePage = lazy(() =>
  import('./EspecialistaCreatePage').then((m) => ({ default: m.EspecialistaCreatePage })),
);

export const EspecialistaEditPage = lazy(() =>
  import('./EspecialistaEditPage').then((m) => ({ default: m.EspecialistaEditPage })),
);

export const EspecialistaDetailPage = lazy(() =>
  import('./EspecialistaDetailPage').then((m) => ({ default: m.EspecialistaDetailPage })),
);

export const ReportesPage = lazy(() =>
  import('./ReportesPage').then((m) => ({ default: m.ReportesPage })),
);

export const AnalisisDesempenoPage = lazy(() =>
  import('./AnalisisDesempenoPage').then((m) => ({ default: m.AnalisisDesempenoPage })),
);

export const SolicitudesVisitaPage = lazy(() =>
  import('./SolicitudesVisitaPage').then((m) => ({ default: m.SolicitudesVisitaPage })),
);

export const GestionMonitoreoPage = lazy(() =>
  import('../director/GestionMonitoreoPage').then((m) => ({ default: m.GestionMonitoreoPage })),
);

export const PlantillasPage = lazy(() =>
  import('./PlantillasPage').then((m) => ({ default: m.PlantillasPage })),
);

export const PlantillaCreatePage = lazy(() =>
  import('./PlantillaCreatePage').then((m) => ({ default: m.PlantillaCreatePage })),
);

export const PlantillaEditPage = lazy(() =>
  import('./PlantillaEditPage').then((m) => ({ default: m.PlantillaEditPage })),
);
