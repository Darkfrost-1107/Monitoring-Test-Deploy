import type { RouteObject } from 'react-router-dom';
import { LazyLoader } from '@shared/ui/LazyLoader';
import { ProtectedRoute } from '@shared/ui/ProtectedRoute';
import {
  CalendarioPage,
  CoordinadorCreatePage,
  CoordinadorCreateDirectoPage,
  CoordinadorListPage,
  CronogramaPage,
  DocenteCreatePage,
  DocenteDetailPage,
  DocenteEditPage,
  DocenteListPage,
  InstitucionCreatePage,
  InstitucionEditPage,
  InstitucionesPage,
  InstitutionDetailPage,
  JefeAreaCreatePage,
  JefeAreaDetailPage,
  JefeAreaEditPage,
  JefeTallerAssignPage,
  JefeTallerCreatePage,
  JefesAreaPage,
  JefesTallerPage,
  SubdirectorAssignPage,
  SubdirectorCreatePage,
  SubdirectoresPage,
} from './jefeArea.lazy';

// ── Instituciones ──

// ── Directores / Docentes (Usando Switchers para soportar tanto Jefe de Área como Director de IE) ──

// ── Jefes de Área (Tus nuevas páginas creadas) ──

// ── Monitoreo (mismas páginas que Jefe de Gestión) ──

export const adminRoutes: RouteObject[] = [
  // Padrón de Instituciones
  {
    element: <ProtectedRoute permission="instituciones_padron" />,
    children: [
      {
        path: 'instituciones/padron',
        element: (
          <LazyLoader>
            <InstitucionesPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/nuevo',
        element: (
          <LazyLoader>
            <InstitucionCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/:id/editar',
        element: (
          <LazyLoader>
            <InstitucionEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/:id',
        element: (
          <LazyLoader>
            <InstitutionDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // Padrón de Directores / Docentes
  {
    element: <ProtectedRoute permission="instituciones_docentes" />,
    children: [
      {
        path: 'instituciones/docentes',
        element: (
          <LazyLoader>
            <DocenteListPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/docentes/nuevo',
        element: (
          <LazyLoader>
            <DocenteCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/docentes/:id/editar',
        element: (
          <LazyLoader>
            <DocenteEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/docentes/:id',
        element: (
          <LazyLoader>
            <DocenteDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // Padrón de Subdirectores
  {
    element: <ProtectedRoute permission="instituciones_subdirectores" />,
    children: [
      {
        path: 'instituciones/subdirectores',
        element: (
          <LazyLoader>
            <SubdirectoresPage />
          </LazyLoader>
        ),
      },
      {
        // Asignar subdirector desde padrón existente
        path: 'instituciones/subdirectores/nuevo',
        element: (
          <LazyLoader>
            <SubdirectorAssignPage />
          </LazyLoader>
        ),
      },
      {
        // Registrar subdirector nuevo directamente
        path: 'instituciones/subdirectores/registrar',
        element: (
          <LazyLoader>
            <SubdirectorCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/subdirectores/:id/editar',
        element: (
          <LazyLoader>
            <DocenteEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/subdirectores/:id',
        element: (
          <LazyLoader>
            <DocenteDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // Padrón de Jefes de Gestión (Coordinadores) apuntados temporalmente a JefesArea para que compile sin archivos perdidos
  {
    element: <ProtectedRoute permission="instituciones_coordinadores" />,
    children: [
      {
        path: 'instituciones/coordinadores',
        element: (
          <LazyLoader>
            <CoordinadorListPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/coordinadores/nuevo',
        element: (
          <LazyLoader>
            <CoordinadorCreatePage />
          </LazyLoader>
        ),
      },
      {
        // Registrar coordinador nuevo directamente (sin pasar por padrón de docentes)
        path: 'instituciones/coordinadores/registrar',
        element: (
          <LazyLoader>
            <CoordinadorCreateDirectoPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/coordinadores/:id/editar',
        element: (
          <LazyLoader>
            <JefeAreaEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/coordinadores/:id',
        element: (
          <LazyLoader>
            <JefeAreaDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // Padrón de Jefes de Taller
  {
    element: <ProtectedRoute permission="instituciones_jefes_taller" />,
    children: [
      {
        path: 'instituciones/jefes-taller',
        element: (
          <LazyLoader>
            <JefesTallerPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/jefes-taller/nuevo',
        element: (
          <LazyLoader>
            <JefeTallerAssignPage />
          </LazyLoader>
        ),
      },
      {
        // Registrar jefe de taller nuevo directamente
        path: 'instituciones/jefes-taller/registrar',
        element: (
          <LazyLoader>
            <JefeTallerCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/jefes-taller/:id/editar',
        element: (
          <LazyLoader>
            <DocenteEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'instituciones/jefes-taller/:id',
        element: (
          <LazyLoader>
            <DocenteDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // Bloque de Jefes de Área con CRUD Completo
  {
    element: <ProtectedRoute permission="jefes_area" />,
    children: [
      {
        path: 'jefes-area',
        element: (
          <LazyLoader>
            <JefesAreaPage />
          </LazyLoader>
        ),
      },
      {
        path: 'jefes-area/nuevo',
        element: (
          <LazyLoader>
            <JefeAreaCreatePage />
          </LazyLoader>
        ),
      },
      {
        path: 'jefes-area/:id/editar',
        element: (
          <LazyLoader>
            <JefeAreaEditPage />
          </LazyLoader>
        ),
      },
      {
        path: 'jefes-area/:id',
        element: (
          <LazyLoader>
            <JefeAreaDetailPage />
          </LazyLoader>
        ),
      },
    ],
  },
  // ── Módulo de Monitoreo (compartido con Jefe de Gestión) ──
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
];
