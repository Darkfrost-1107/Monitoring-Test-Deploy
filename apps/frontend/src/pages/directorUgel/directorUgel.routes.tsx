import type { RouteObject } from 'react-router-dom';
import { LazyLoader } from '@shared/ui/LazyLoader';
import { ProtectedRoute } from '@shared/ui/ProtectedRoute';
import {
  DashboardEntry,
  SemaforoInstitucionalPage,
} from './directorUgel.lazy';

export const directorUgelRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute permission="dashboard" />,
    children: [
      {
        path: 'dashboard',
        element: (
          <LazyLoader>
            <DashboardEntry />
          </LazyLoader>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute permission="instituciones_padron" />,
    children: [
      {
        path: 'instituciones/semaforo',
        element: (
          <LazyLoader>
            <SemaforoInstitucionalPage />
          </LazyLoader>
        ),
      },
    ],
  },
];
