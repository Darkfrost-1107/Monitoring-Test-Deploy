import { lazy } from 'react';

/**
 * Páginas de jefe de área, cargadas bajo demanda.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Viven aparte del manifiesto de rutas porque
 * `react-refresh/only-export-components` exige que un archivo no mezcle
 * declaraciones de componente con exportaciones que no lo son —y un manifiesto
 * de rutas es, por definición, lo segundo—. Separarlos permite retirar la
 * supresión en lugar de convivir con ella.
 */

export const InstitucionesPage = lazy(() =>
  import('./institucionesPage').then((m) => ({ default: m.InstitucionesPage })),
);

export const InstitucionCreatePage = lazy(() =>
  import('./InstitutionCreatePage').then((m) => ({ default: m.InstitucionCreatePage })),
);

export const InstitucionEditPage = lazy(() =>
  import('./InstitutionEditPage').then((m) => ({ default: m.InstitucionEditPage })),
);

export const InstitutionDetailPage = lazy(() =>
  import('./InstitutionDetailPage').then((m) => ({ default: m.InstitutionDetailPage })),
);

export const DocenteListPage = lazy(() =>
  import('../director/DocenteSwitchers').then((m) => ({ default: m.DocenteListSwitcher })),
);

export const DocenteCreatePage = lazy(() =>
  import('../director/DocenteSwitchers').then((m) => ({ default: m.DocenteCreateSwitcher })),
);

export const DocenteEditPage = lazy(() =>
  import('../director/DocenteSwitchers').then((m) => ({ default: m.DocenteEditSwitcher })),
);

export const DocenteDetailPage = lazy(() =>
  import('../director/DocenteSwitchers').then((m) => ({ default: m.DocenteDetailSwitcher })),
);

export const CoordinadorListPage = lazy(() =>
  import('../director/DocenteSwitchers').then((m) => ({ default: m.CoordinadorSwitcher })),
);

export const CoordinadorCreatePage = lazy(() =>
  import('../director/DocenteSwitchers').then((m) => ({ default: m.CoordinadorCreateSwitcher })),
);

export const JefesTallerPage = lazy(() =>
  import('../director/JefesTallerPage').then((m) => ({ default: m.JefesTallerPage })),
);

export const JefeTallerAssignPage = lazy(() =>
  import('../director/JefeTallerAssignPage').then((m) => ({ default: m.JefeTallerAssignPage })),
);

export const JefesAreaPage = lazy(() =>
  import('../jefeGestion/JefesAreaPage').then((m) => ({ default: m.JefesAreaPage })),
);

export const JefeAreaCreatePage = lazy(() =>
  import('../jefeGestion/JefeAreaCreatePage').then((m) => ({ default: m.JefeAreaCreatePage })),
);

export const JefeAreaEditPage = lazy(() =>
  import('../jefeGestion/JefeAreaEditPage').then((m) => ({ default: m.JefeAreaEditPage })),
);

export const JefeAreaDetailPage = lazy(() =>
  import('../jefeGestion/JefeAreaDetailPage').then((m) => ({ default: m.JefeAreaDetailPage })),
);

export const CronogramaPage = lazy(() =>
  import('../jefeGestion/CronogramaPage').then((m) => ({ default: m.CronogramaPage })),
);

export const CalendarioPage = lazy(() =>
  import('../jefeGestion/CalendarioPage').then((m) => ({ default: m.CalendarioPage })),
);
