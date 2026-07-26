export type UserRole =
  | 'director_ugel'
  | 'jefe_area'
  | 'jefe_gestion'
  | 'coordinador_pedagogico'
  | 'jefe_taller'
  | 'especialista'
  | 'director_institucion'
  | 'docente'
  | 'invitado'
  | 'admin'
  | 'superusuario';

export const ROLE_LABELS: Record<UserRole, string> = {
  director_ugel: 'Director UGEL',
  jefe_area: 'Jefe de Área',
  coordinador_pedagogico: 'Coordinador Pedagógico',
  jefe_taller: 'Jefe de Taller',
  jefe_gestion: 'Jefe de Gestión',
  especialista: 'Especialista',
  director_institucion: 'Director de Institución',
  docente: 'Docente',
  invitado: 'Invitado',
  admin: 'Administrador del Sistema',
  superusuario: 'Super Administrador',
};

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
  | 'configuracion'
  | 'superadmin'
  | 'superadmin_director'
  | 'superadmin_jefe';

const BASE_PERMISSIONS: MenuItem[] = ['reportes'];

export const ROLE_PERMISSIONS: Record<UserRole, MenuItem[]> = {
  admin: [
    'dashboard', 'monitoreo', 'monitoreo_plan', 'monitoreo_gestion', 'monitoreo_reportes',
    'monitoreo_plan_anual', 'monitoreo_cronograma', 'monitoreo_calendario', 'plantillas',
    'plantillas_ugel', 'plantillas_ies',
    'instituciones', 'instituciones_padron', 'instituciones_padron_lista', 'instituciones_padron_personal', 'instituciones_docentes', 'instituciones_coordinadores',
    'instituciones_jefes_taller', 'especialistas', 'jefes_area', 'reportes', 'configuracion'
  ],

  director_ugel: [
    'dashboard',
    'focos_atencion',
    'reportes',
    'monitoreo_reportes'
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
    'monitoreo_reportes',
    'instituciones_padron',
    'instituciones_docentes',
  ],

  jefe_area: [
    'instituciones_padron',
    'instituciones_docentes',
    'monitoreo',
    'monitoreo_cronograma',
    'monitoreo_calendario',
    'focos_atencion',
    'solicitudes_visita',
    'reportes',
    'monitoreo_reportes',
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
  ],

  especialista: [
    'monitoreo',
    'monitoreo_calendario',
    'focos_atencion',
    'solicitudes_visita',
    'reportes',
    'monitoreo_reportes',
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
    'instituciones_jefes_taller',
    'monitoreo_reportes',
    'reportes',
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
    'especialistas',
    'reportes',
    'configuracion',
  ],
  superusuario: ['superadmin', 'superadmin_director', 'superadmin_jefe'],
};

const READ_ONLY_ROLES: UserRole[] = ['invitado'];

// ── FUNCIONES DE VERIFICACIÓN Y UTILS ──

export const hasPermission = (role: UserRole, item: MenuItem): boolean =>
  (ROLE_PERMISSIONS[role] ?? []).includes(item);

export const isReadOnlyRole = (role: UserRole): boolean => READ_ONLY_ROLES.includes(role);

export const getDefaultLandingPage = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'superusuario':
      return '/superadmin';
    case 'jefe_area':
      return '/instituciones/padron';
    case 'jefe_gestion':
      return '/especialistas';
    case 'especialista':
      return '/monitoreo/calendario';
    case 'director_institucion':
      return '/dashboard';
    case 'coordinador_pedagogico':
    case 'jefe_taller':
      return '/monitoreo/calendario';
    case 'docente':
      return '/reportes';
    default:
      return '/dashboard';
  }
};
