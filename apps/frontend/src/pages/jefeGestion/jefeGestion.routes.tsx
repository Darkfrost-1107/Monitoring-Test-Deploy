import type { RouteObject } from 'react-router-dom';
import { LazyLoader } from '@shared/ui/LazyLoader';
import { ProtectedRoute } from '@shared/ui/ProtectedRoute';
import {
  CalendarioPage,
  CronogramaPage,
  EspecialistaCreatePage,
  EspecialistaDetailPage,
  EspecialistaEditPage,
  EspecialistasPage,
  GestionMonitoreoPage,
  PlanMonitoreoAnualPage,
  PlanMonitoreoPage,
  PlantillaCreatePage,
  PlantillaEditPage,
  PlantillasPage,
  ReportesPage,
  AnalisisDesempenoPage,
  SolicitudesVisitaPage,
} from './jefeGestion.lazy';

export const jefeGestionRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute permission="monitoreo_plan" />,
    children: [
      {
        path: 'monitoreo/plan',
        element: (
          <LazyLoader>
            <PlanMonitoreoPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="monitoreo_plan_anual" />,
    children: [
      {
        path: 'monitoreo/plan-anual',
        element: (
          <LazyLoader>
            <PlanMonitoreoAnualPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="monitoreo_cronograma" />,
    children: [
      {
        path: 'monitoreo/cronograma',
        element: (
          <LazyLoader>
            <CronogramaPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="monitoreo_calendario" />,
    children: [
      {
        path: 'monitoreo/calendario',
        element: (
          <LazyLoader>
            <CalendarioPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="monitoreo_gestion" />,
    children: [
      {
        path: 'monitoreo/gestion',
        element: (
          <LazyLoader>
            <GestionMonitoreoPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="solicitudes_visita" />,
    children: [
      {
        path: 'monitoreo/solicitudes-visita',
        element: (
          <LazyLoader>
            <SolicitudesVisitaPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="especialistas" />,
    children: [
      {
        path: 'especialistas',
        element: (
          <LazyLoader>
            <EspecialistasPage />
          </LazyLoader>
        ),
      },
      {
        path: 'especialistas/nuevo',
        element: (
          <LazyLoader>
            <EspecialistaCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'especialistas/:id/editar',
        element: (
          <LazyLoader>
            <EspecialistaEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'especialistas/:id',
        element: (
          <LazyLoader>
            <EspecialistaDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="reportes" />,
    children: [
      {
        path: 'reportes',
        element: (
          <LazyLoader>
            <ReportesPage />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    /**
     * El análisis pide su propio permiso, no el del grupo «Reportes».
     *
     * Con `permission="reportes"` alcanzaba al docente, que lo tiene entre sus
     * permisos base: no veía la entrada en el menú, pero escribiendo la URL
     * entraba. El análisis agrega resultados de varias personas y no es algo
     * que el evaluado deba mirar.
     */
    element: <ProtectedRoute permission="reportes_analisis" />,
    children: [
      {
        path: 'reportes/analisis',
        element: (
          <LazyLoader>
            <AnalisisDesempenoPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // Plantillas de Monitoreo (Jefe de Gestión)
  {
    element: <ProtectedRoute permission="plantillas" />,
    children: [
      {
        path: 'plantillas',
        element: (
          <LazyLoader>
            <PlantillasPage />
          </LazyLoader>
        ),
      },
      {
        path: 'plantillas/nuevo',
        element: (
          <LazyLoader>
            <PlantillaCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'plantillas/:id/editar',
        element: (
          <LazyLoader>
            <PlantillaEditPage />
          </LazyLoader>
        ),
      },
    ],
  },
];
