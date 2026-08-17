/**
 * Permisos de navegación por rol.
 *
 * Fase 1 de PLAN_REMEDIACION.md trasladó al contrato compartido el tipo
 * `UserRole` y el diccionario `ROLE_LABELS` que este archivo declaraba, y los
 * reexportaba por compatibilidad. Fase 7 retiró esa reexportación: quien los
 * necesite los toma del contrato.
 *
 * `ROLE_PERMISSIONS` sigue siendo una matriz estática mantenida a mano y
 * paralela al mapa de capacidades del backend (`shared/auth/capability-map.ts`).
 * Unificar ambas es trabajo de la Fase 2, no de esta.
 */

import { RoleCode, type UserRole } from '@sistema-monitoreo/shared-contracts';

export type MenuItem =
  | 'dashboard'
  | 'monitoreo'
  | 'monitoreo_plan'
  | 'monitoreo_gestion'
  | 'monitoreo_reportes'
  | 'monitoreo_plan_anual'
  | 'monitoreo_cronograma'
  | 'monitoreo_calendario'
  | 'plantillas'
  | 'plantillas_ugel'
  | 'plantillas_ies'
  | 'instituciones'
  | 'instituciones_padron'
  | 'instituciones_padron_lista'
  | 'instituciones_padron_personal'
  | 'instituciones_docentes'
  | 'instituciones_coordinadores'
  | 'instituciones_jefes_taller'
  | 'especialistas'
  | 'jefes_area'
  | 'focos_atencion'
  | 'solicitudes_visita'
  | 'reportes'
  | 'reportes_fichas'
  | 'reportes_analisis'
  | 'configuracion'
  | 'superadmin'
  | 'superadmin_director'
  | 'superadmin_jefe'
  | 'mi_firma';

const BASE_PERMISSIONS: MenuItem[] = ['reportes', 'reportes_fichas', 'mi_firma'];

// La entrada `admin` se retiró aquí: concedía 22 de los 28 ítems de menú —el
// conjunto más amplio del sistema— a un rol que el backend nunca podía emitir.
// No figura en `RoleCode`, no lo siembra `database/seeders/auth.js` y ni
// `ADMIN_ROLES` lo incluía. El rol que gestiona altos cargos es `superusuario`.
export const ROLE_PERMISSIONS: Record<UserRole, MenuItem[]> = {
  director_ugel: [
    'dashboard',
    'focos_atencion',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'monitoreo_reportes',
  ],

  jefe_gestion: [
    'monitoreo',
    'monitoreo_plan_anual',
    'monitoreo_cronograma',
    'monitoreo_calendario',
    'plantillas',
    'plantillas_ugel',
    'plantillas_ies',
    'especialistas',
    'jefes_area',
    'focos_atencion',
    'solicitudes_visita',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'instituciones_padron',
    'instituciones_docentes',
    'mi_firma',
  ],

  jefe_area: [
    'instituciones_padron',
    'instituciones_docentes',
    'monitoreo',
    'monitoreo_cronograma',
    'monitoreo_calendario',
    'focos_atencion',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'monitoreo_reportes',
    'mi_firma',
  ],

  coordinador_pedagogico: [
    'monitoreo',
    'monitoreo_plan_anual',
    'monitoreo_cronograma',
    'monitoreo_calendario',
    'monitoreo_reportes',
    'plantillas',
    'plantillas_ies',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'mi_firma',
  ],

  jefe_taller: [
    'monitoreo',
    'monitoreo_plan_anual',
    'monitoreo_cronograma',
    'monitoreo_calendario',
    'monitoreo_reportes',
    'plantillas',
    'plantillas_ies',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'mi_firma',
  ],

  especialista: [
    'monitoreo',
    'monitoreo_calendario',
    'focos_atencion',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'monitoreo_reportes',
    'mi_firma',
  ],

  director_institucion: [
    'dashboard',
    'monitoreo',
    'monitoreo_plan_anual',
    'monitoreo_cronograma',
    'monitoreo_calendario',
    'plantillas',
    'plantillas_ugel',
    'plantillas_ies',
    'instituciones_docentes',
    'instituciones_coordinadores',
    'monitoreo_reportes',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'mi_firma',
  ],

  docente: [...BASE_PERMISSIONS],

  invitado: [
    'dashboard',
    'monitoreo',
    'monitoreo_plan',
    'monitoreo_gestion',
    'monitoreo_reportes',
    'plantillas',
    'plantillas_ugel',
    'plantillas_ies',
    'instituciones',
    'instituciones_padron',
    'instituciones_docentes',
    'instituciones_coordinadores',
    'reportes',
    'reportes_fichas',
    'reportes_analisis',
    'configuracion',
    'mi_firma',
  ],
  superusuario: ['superadmin', 'superadmin_director', 'superadmin_jefe'],
};

import { READ_ONLY_ROLES } from '@sistema-monitoreo/shared-contracts';

// ── FUNCIONES DE VERIFICACIÓN Y UTILS ──

export const hasPermission = (role: UserRole, item: MenuItem): boolean =>
  (ROLE_PERMISSIONS[role] ?? []).includes(item);

export const isReadOnlyRole = (role: UserRole): boolean => READ_ONLY_ROLES.includes(role);

/**
 * Pantalla a la que llega cada rol tras iniciar sesión.
 *
 * Distingue por rol **a propósito** y no se deriva del menú. Cada destino es una
 * decisión deliberada sobre cuál es la tarea principal de esa persona: el jefe
 * de gestión llega a Especialistas porque gestionarlos es su trabajo, no porque
 * sea el primer ítem que le corresponda. Calcularlo como «el primer ítem
 * disponible» sustituiría intención por un accidente del orden de declaración.
 *
 * Lo que sí debe garantizarse es que el destino sea alcanzable para el rol, y
 * eso lo cubre `getDefaultLandingPage.test.ts` en lugar de un refactor.
 */
export const getDefaultLandingPage = (role: UserRole): string => {
  switch (role) {
    case RoleCode.SUPERUSUARIO:
      return '/superadmin';
    case RoleCode.JEFE_AREA:
      return '/instituciones/padron';
    case RoleCode.JEFE_GESTION:
      return '/especialistas';
    case RoleCode.ESPECIALISTA:
      return '/monitoreo/calendario';
    case RoleCode.DIRECTOR_INSTITUCION:
      return '/dashboard';
    case RoleCode.COORDINADOR_PEDAGOGICO:
    case RoleCode.JEFE_TALLER:
      return '/monitoreo/calendario';
    case RoleCode.DOCENTE:
      return '/reportes';
    default:
      return '/dashboard';
  }
};
