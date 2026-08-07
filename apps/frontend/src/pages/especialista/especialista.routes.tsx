import type { RouteObject } from 'react-router-dom';
import { LazyLoader } from '@shared/ui/LazyLoader';
import { ProtectedRoute } from '@shared/ui/ProtectedRoute';
import { ReportesMonitoreoPage } from './especialista.lazy';

export const especialistaRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute permission="monitoreo_reportes" />,
    children: [
      {
        path: 'monitoreo/reportes',
        element: (
          <LazyLoader>
            <ReportesMonitoreoPage />
          </LazyLoader>
        ),
      },
    ],
  },
];
