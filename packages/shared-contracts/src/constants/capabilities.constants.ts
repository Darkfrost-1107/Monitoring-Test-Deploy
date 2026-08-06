/**
 * Vocabulario de capacidades — contrato de autorización compartido.
 *
 * Fase 2 de PLAN_REMEDIACION.md.
 *
 * El backend ya decidía la autorización por capacidades: las calcula en
 * `shared/auth/capability-map.ts` componiendo rol, cargo de especialista y
 * cargos docentes, las emite en el JWT y las exige con `@RequirePermissions()`
 * en 28 controladores. Lo que faltaba era que ese vocabulario viviera en el
 * contrato compartido, de modo que el frontend pudiera consultarlo en lugar de
 * comparar literales de rol.
 *
 * La pregunta que responde este módulo es «¿puede este usuario ejecutar esta
 * acción?», no «¿qué rol tiene?». Esa diferencia es la que permite incorporar un
 * rol nuevo sin recorrer la capa de presentación.
 *
 * ── Advertencia sobre el alcance ──
 * En el frontend estas capacidades sirven ÚNICAMENTE para decidir qué mostrar.
 * NO son un control de seguridad: viajan en el objeto de usuario persistido en
 * `localStorage` y son manipulables por quien controle el navegador. La
 * autorización real la aplica `PermissionsGuard` del backend en cada petición.
 * Ocultar un botón no protege el endpoint que hay detrás.
 */

/**
 * Capacidades del sistema. Los valores coinciden con `Permiso.codigo` en la base
 * de datos y con las cadenas que `@RequirePermissions()` valida en el backend.
 */
export const Capability = {
  /** Ver reportes. El alcance (todo / ámbito / propio) lo decide el ScopeFilter. */
  REPORTS_READ: 'reports:read',
  /** Consultar fichas y plantillas de monitoreo. */
  MONITOREO_READ: 'monitoreo:read',
  /** Ejecutar y registrar monitoreos. */
  MONITOREO_EXECUTE: 'monitoreo:execute',
  /** Ver el panel de control y sus estadísticas. */
  DASHBOARD_READ: 'dashboard:read',
  /** Listar y ver instituciones educativas. */
  INSTITUCIONES_READ: 'instituciones:read',
  /** Crear, editar y dar de baja instituciones. */
  INSTITUCIONES_WRITE: 'instituciones:write',
  /** Listar y ver docentes. */
  DOCENTES_READ: 'docentes:read',
  /** Registrar, editar y dar de baja docentes. */
  DOCENTES_WRITE: 'docentes:write',
  /** Listar y ver especialistas. */
  ESPECIALISTAS_READ: 'especialistas:read',
  /** Crear, editar e inactivar especialistas. */
  ESPECIALISTAS_WRITE: 'especialistas:write',
  /** Emitir notificaciones. */
  NOTIFICACIONES_SEND: 'notificaciones:send',
  /** Solicitar una visita de monitoreo. */
  VISITAS_SOLICITAR: 'visitas:solicitar',
  /** Aprobar, rechazar y reprogramar solicitudes de visita. */
  VISITAS_GESTIONAR: 'visitas:gestionar',
  /** Asignar altos cargos (Jefe de Gestión y Director UGEL). */
  SUPERADMIN_ACCESS: 'superadmin:access',
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];

/** Todas las capacidades declaradas. */
export const ALL_CAPABILITIES: readonly Capability[] = Object.values(Capability);

/** Descripción legible por persona, para pantallas de administración y auditoría. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  [Capability.REPORTS_READ]: 'Ver reportes',
  [Capability.MONITOREO_READ]: 'Consultar monitoreos',
  [Capability.MONITOREO_EXECUTE]: 'Realizar monitoreos',
  [Capability.DASHBOARD_READ]: 'Ver panel de control',
  [Capability.INSTITUCIONES_READ]: 'Ver instituciones',
  [Capability.INSTITUCIONES_WRITE]: 'Gestionar instituciones',
  [Capability.DOCENTES_READ]: 'Ver docentes',
  [Capability.DOCENTES_WRITE]: 'Gestionar docentes',
  [Capability.ESPECIALISTAS_READ]: 'Ver especialistas',
  [Capability.ESPECIALISTAS_WRITE]: 'Gestionar especialistas',
  [Capability.NOTIFICACIONES_SEND]: 'Enviar notificaciones',
  [Capability.VISITAS_SOLICITAR]: 'Solicitar visitas',
  [Capability.VISITAS_GESTIONAR]: 'Gestionar solicitudes de visita',
  [Capability.SUPERADMIN_ACCESS]: 'Asignar altos cargos',
};

/** Verifica en tiempo de ejecución que una cadena sea una capacidad conocida. */
export function isCapability(value: unknown): value is Capability {
  return typeof value === 'string' && (ALL_CAPABILITIES as readonly string[]).includes(value);
}

/**
 * Evalúa si un conjunto de capacidades incluye todas las requeridas.
 *
 * Es la misma semántica conjuntiva que aplica `PermissionsGuard` en el backend,
 * declarada una sola vez para que ambos lados no puedan divergir.
 */
export function hasAllCapabilities(
  granted: readonly string[] | undefined,
  required: readonly Capability[],
): boolean {
  if (required.length === 0) return true;
  if (!granted || granted.length === 0) return false;
  return required.every((capability) => granted.includes(capability));
}

/** Evalúa si un conjunto de capacidades incluye al menos una de las requeridas. */
export function hasAnyCapability(
  granted: readonly string[] | undefined,
  required: readonly Capability[],
): boolean {
  if (required.length === 0) return true;
  if (!granted || granted.length === 0) return false;
  return required.some((capability) => granted.includes(capability));
}
