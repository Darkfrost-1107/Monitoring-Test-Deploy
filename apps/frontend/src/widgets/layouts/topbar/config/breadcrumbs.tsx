import type { UserRole } from '@sistema-monitoreo/shared-contracts';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

export const BREADCRUMBS_MAP: Record<string, string> = {
  '/dashboard': 'Panel de Control',
  '/monitoreo/plan': 'Plan de Monitoreo',
  '/monitoreo/plan-anual': 'Plan de Monitoreo Anual',
  '/monitoreo/cronograma': 'Cronograma',
  '/monitoreo/calendario': 'Calendario',
  '/monitoreo/gestion': 'Gestión de Monitoreo',
  '/instituciones/docentes': 'Padrón de Docentes', // Más específico primero
  '/instituciones': 'Padrón de Instituciones',
  '/especialistas': 'Especialistas',
  '/plantillas': 'Catálogo de Plantillas',
  '/plantillas/nuevo': 'Registrar Plantilla',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
  '/superadmin/director/nuevo': 'Registrar Director UGEL', // Más específico primero
  '/superadmin/director': 'Director UGEL',
  '/superadmin/jefe/nuevo': 'Registrar Jefe de Gestión',
  '/superadmin/jefe': 'Jefe de Gestión',
};

/** Prefijo raíz del breadcrumb; también es el título de respaldo cuando no hay coincidencia. */
export const ROOT_CRUMB = 'UGEL Lampa';

export const getPageTitle = (pathname: string, role?: UserRole): string => {
  // El padrón de /instituciones/docentes cambia de etiqueta según el rol:
  // el Jefe de Área gestiona Directores; el Director de IE gestiona Docentes.
  if (pathname.startsWith('/instituciones/docentes')) {
    return role === RoleCode.JEFE_AREA || role === RoleCode.JEFE_GESTION
      ? 'Padrón de Directores'
      : 'Padrón de Docentes';
  }

  // 1. Búsqueda exacta
  if (BREADCRUMBS_MAP[pathname]) return BREADCRUMBS_MAP[pathname];

  // 2. Búsqueda parcial (útil para rutas como /docentes/123/editar)
  // Ordenamos por longitud para que coincida primero con la ruta más larga
  const matchedKey = Object.keys(BREADCRUMBS_MAP)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));

  return matchedKey ? BREADCRUMBS_MAP[matchedKey] : ROOT_CRUMB;
};
