import { Capability } from '@sistema-monitoreo/shared-contracts';
import type { MenuItem } from './roles';

/**
 * Capacidad que exige cada ítem de navegación.
 *
 * Fase 2 de PLAN_REMEDIACION.md. `ROLE_PERMISSIONS` es una matriz de 10 roles
 * por 28 ítems mantenida a mano y paralela al modelo de capacidades del backend.
 * Este mapa es el paso previo para derivarla: en lugar de enumerar qué ve cada
 * rol, se declara qué capacidad exige cada ítem y el menú se calcula desde las
 * capacidades efectivas que el backend ya emite en el token.
 *
 * La ventaja no es sólo dejar de mantener una tabla. Las capacidades efectivas
 * componen rol + cargo de especialista + cargos docentes, de modo que el menú
 * pasa a reflejar los cargos reales de la persona y no sólo su rol de
 * autenticación.
 *
 * Cada ítem se asocia a la capacidad que exige el endpoint al que conduce, de
 * modo que el menú no ofrezca destinos que el backend va a rechazar.
 *
 * `null` significa que el ítem no exige capacidad alguna: es un contenedor de
 * submenús o una pantalla disponible para cualquier sesión.
 */
export const MENU_CAPABILITIES: Record<MenuItem, Capability | null> = {
  // ── Panel y reportes ───────────────────────────────────────────────────────
  dashboard: Capability.DASHBOARD_READ,
  reportes: Capability.REPORTS_READ,
  reportes_fichas: Capability.REPORTS_READ,
  reportes_analisis: Capability.REPORTS_READ,
  focos_atencion: Capability.DASHBOARD_READ,

  // ── Monitoreo ──────────────────────────────────────────────────────────────
  monitoreo: Capability.MONITOREO_READ,
  monitoreo_plan: Capability.MONITOREO_READ,
  monitoreo_gestion: Capability.MONITOREO_READ,
  monitoreo_reportes: Capability.REPORTS_READ,
  monitoreo_plan_anual: Capability.MONITOREO_EXECUTE,
  monitoreo_cronograma: Capability.MONITOREO_EXECUTE,
  monitoreo_calendario: Capability.MONITOREO_READ,

  // ── Plantillas ─────────────────────────────────────────────────────────────
  plantillas: Capability.MONITOREO_READ,
  plantillas_ugel: Capability.MONITOREO_READ,
  plantillas_ies: Capability.MONITOREO_READ,

  // ── Instituciones y padrón ─────────────────────────────────────────────────
  instituciones: Capability.INSTITUCIONES_READ,
  instituciones_padron: Capability.INSTITUCIONES_READ,
  instituciones_padron_lista: Capability.INSTITUCIONES_READ,
  instituciones_padron_personal: Capability.INSTITUCIONES_READ,
  instituciones_docentes: Capability.DOCENTES_READ,
  instituciones_coordinadores: Capability.DOCENTES_READ,
  instituciones_jefes_taller: Capability.DOCENTES_READ,

  // ── Personal de UGEL ───────────────────────────────────────────────────────
  especialistas: Capability.ESPECIALISTAS_READ,
  jefes_area: Capability.ESPECIALISTAS_READ,

  // ── Visitas ────────────────────────────────────────────────────────────────
  solicitudes_visita: Capability.VISITAS_SOLICITAR,

  // ── Administración ─────────────────────────────────────────────────────────
  superadmin: Capability.SUPERADMIN_ACCESS,
  superadmin_director: Capability.SUPERADMIN_ACCESS,
  superadmin_jefe: Capability.SUPERADMIN_ACCESS,

  // Pantalla de preferencias de la propia cuenta: no exige capacidad.
  configuracion: null,
  mi_firma: null,
};
