/**
 * Capability map — modelo de autorización dinámico del backend.
 *
 * Sprint 3 (Fase 1.5).
 *
 * Combina tres fuentes de capabilities:
 *   1. ROL_CAPABILITIES: lo que el rol `Usuario.rol` aporta (identidad de auth).
 *   2. ESPECIALISTA_CARGO_CAPABILITIES: lo que el cargo actual en la tabla
 *      Especialista aporta (Especialista | Jefe de Área | Jefe de Gestión).
 *   3. DOCENTE_CARGO_CAPABILITIES: lo que los cargos activos en la tabla
 *      `docente_cargos` aportan (Director, Coord. Ped., Jefe de Taller, etc.).
 *
 * Las capabilities efectivas son la UNIÓN de las tres, más BASE_CAPABILITIES
 * que toda persona tiene (derecho a ver sus propios reportes).
 *
 * El `es_principal` se asigna por CARGO_PRIORIDAD — el cargo activo de mayor
 * prioridad gana. Lo usa el router del frontend para decidir el landing.
 *
 * CARGO_COMPATIBILITY define qué cargos docentes pueden coexistir:
 *   - Director y Subdirector son únicos (no se combinan).
 *   - Coord. Ped., Jefe de Taller, PIP pueden combinarse con Docente de Aula.
 *   - Esto lo valida `canAddCargo()` antes de insertar un DocenteCargo.
 */

import { RoleCode } from '../../common/enums/role.enum.js';
import { Capability } from '@sistema-monitoreo/shared-contracts';

export const CargoNombre = {
  DIRECTOR: 'Director',
  SUBDIRECTOR: 'Subdirector',
  COORDINADOR_PEDAGOGICO: 'Coordinador Pedagógico',
  JEFE_DE_TALLER: 'Jefe de Taller',
  DOCENTE_DE_AULA: 'Docente de Aula',
  PIP: 'PIP',
} as const;
export type CargoNombre = (typeof CargoNombre)[keyof typeof CargoNombre];

export const EspecialistaCargoEnum = {
  ESPECIALISTA: 'Especialista',
  JEFE_AREA: 'Jefe de Área',
  JEFE_GESTION: 'Jefe de Gestión',
} as const;
export type EspecialistaCargoEnum =
  (typeof EspecialistaCargoEnum)[keyof typeof EspecialistaCargoEnum];

/** Permisos base que toda persona tiene, independientemente de rol o cargo. */
export const BASE_CAPABILITIES: readonly Capability[] = [
  Capability.REPORTS_READ,
  Capability.MONITOREO_READ,
] as const;

/** Permisos derivados del ROL (identidad de autenticación del Usuario). */
export const ROL_CAPABILITIES: Record<RoleCode, readonly Capability[]> = {
  [RoleCode.DIRECTOR_UGEL]: [
    Capability.DASHBOARD_READ,
    Capability.INSTITUCIONES_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.JEFE_GESTION]: [
    Capability.ESPECIALISTAS_READ,
    Capability.ESPECIALISTAS_WRITE,
    Capability.INSTITUCIONES_READ,
    Capability.INSTITUCIONES_WRITE,
    Capability.DOCENTES_READ,
    Capability.DOCENTES_WRITE,
    Capability.MONITOREO_EXECUTE,
    Capability.DASHBOARD_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_GESTIONAR,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.SOLICITUDES_PLANTILLA_GESTIONAR,
  ],
  [RoleCode.JEFE_AREA]: [
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.INSTITUCIONES_WRITE,
    Capability.DOCENTES_READ,
    Capability.DOCENTES_WRITE,
    Capability.DASHBOARD_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.ESPECIALISTA]: [
    Capability.MONITOREO_EXECUTE,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.DOCENTES_READ,
    Capability.DASHBOARD_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.DIRECTOR_INSTITUCION]: [
    Capability.DASHBOARD_READ,
    Capability.DOCENTES_READ,
    Capability.DOCENTES_WRITE,
    Capability.MONITOREO_EXECUTE,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.CARPETA_PEDAGOGICA_WRITE,
    Capability.SOLICITUDES_PLANTILLA_SOLICITAR,
  ],
  [RoleCode.COORDINADOR_PEDAGOGICO]: [
    Capability.MONITOREO_EXECUTE,
    Capability.DOCENTES_READ,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.CARPETA_PEDAGOGICA_WRITE,
  ],
  [RoleCode.JEFE_TALLER]: [
    Capability.MONITOREO_EXECUTE,
    Capability.DOCENTES_READ,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.CARPETA_PEDAGOGICA_WRITE,
  ],
  [RoleCode.DOCENTE]: [Capability.CARPETA_PEDAGOGICA_WRITE],
  [RoleCode.INVITADO]: [Capability.DASHBOARD_READ],
  [RoleCode.SUPERUSUARIO]: [
    Capability.SUPERADMIN_ACCESS,
    Capability.ESPECIALISTAS_READ,
    Capability.ESPECIALISTAS_WRITE,
  ],
};

/** Permisos derivados del cargo ACTIVO del Especialista (campo Especialista.cargo). */
export const ESPECIALISTA_CARGO_CAPABILITIES: Record<EspecialistaCargoEnum, readonly Capability[]> =
  {
    [EspecialistaCargoEnum.ESPECIALISTA]: [Capability.MONITOREO_EXECUTE],
    [EspecialistaCargoEnum.JEFE_AREA]: [
      Capability.ESPECIALISTAS_READ,
      Capability.MONITOREO_EXECUTE,
      Capability.INSTITUCIONES_WRITE,
      Capability.DOCENTES_WRITE,
    ],
    [EspecialistaCargoEnum.JEFE_GESTION]: [
      Capability.ESPECIALISTAS_WRITE,
      Capability.INSTITUCIONES_WRITE,
      Capability.DOCENTES_WRITE,
      Capability.VISITAS_GESTIONAR,
    ],
  };

/** Permisos derivados de los cargos ACTIVOS del docente (tabla docente_cargos). */
export const DOCENTE_CARGO_CAPABILITIES: Record<CargoNombre, readonly Capability[]> = {
  [CargoNombre.DIRECTOR]: [
    Capability.DASHBOARD_READ,
    Capability.INSTITUCIONES_WRITE,
    Capability.DOCENTES_WRITE,
    Capability.MONITOREO_EXECUTE,
    // El director de la I.E. es la única boca de su institución para pedir
    // plantillas propias, tramite lo suyo o lo del taller y la coordinación.
    Capability.SOLICITUDES_PLANTILLA_SOLICITAR,
  ],
  [CargoNombre.SUBDIRECTOR]: [Capability.DOCENTES_WRITE, Capability.MONITOREO_EXECUTE],
  [CargoNombre.COORDINADOR_PEDAGOGICO]: [Capability.MONITOREO_EXECUTE],
  [CargoNombre.JEFE_DE_TALLER]: [Capability.MONITOREO_EXECUTE],
  [CargoNombre.DOCENTE_DE_AULA]: [],
  [CargoNombre.PIP]: [],
};

/** Orden de prioridad para el campo `es_principal` (mayor gana). */
export const CARGO_PRIORIDAD: Record<CargoNombre, number> = {
  [CargoNombre.DIRECTOR]: 5,
  [CargoNombre.SUBDIRECTOR]: 4,
  [CargoNombre.COORDINADOR_PEDAGOGICO]: 3,
  [CargoNombre.JEFE_DE_TALLER]: 2,
  [CargoNombre.PIP]: 1,
  [CargoNombre.DOCENTE_DE_AULA]: 0,
};

/** Reglas de coexistencia de cargos docentes (validado a nivel service). */
export const CARGO_COMPATIBILITY: Record<
  CargoNombre,
  { canCombineWith: CargoNombre[]; isUnique: boolean }
> = {
  [CargoNombre.DIRECTOR]: { canCombineWith: [], isUnique: true },
  [CargoNombre.SUBDIRECTOR]: { canCombineWith: [], isUnique: true },
  [CargoNombre.COORDINADOR_PEDAGOGICO]: {
    canCombineWith: [CargoNombre.DOCENTE_DE_AULA],
    isUnique: false,
  },
  [CargoNombre.JEFE_DE_TALLER]: { canCombineWith: [CargoNombre.DOCENTE_DE_AULA], isUnique: false },
  [CargoNombre.PIP]: { canCombineWith: [CargoNombre.DOCENTE_DE_AULA], isUnique: false },
  [CargoNombre.DOCENTE_DE_AULA]: {
    canCombineWith: [
      CargoNombre.COORDINADOR_PEDAGOGICO,
      CargoNombre.JEFE_DE_TALLER,
      CargoNombre.PIP,
    ],
    isUnique: false,
  },
};

/**
 * Verifica si un docente puede recibir un nuevo cargo respetando las reglas de coexistencia.
 * Llamar antes de hacer `INSERT` en `docente_cargos` con `fecha_fin = NULL`.
 */
export function canAddCargo(currentCargos: CargoNombre[], nuevoCargo: CargoNombre): boolean {
  const rule = CARGO_COMPATIBILITY[nuevoCargo];
  if (rule.isUnique && currentCargos.length > 0) return false;
  return currentCargos.every((c) => CARGO_COMPATIBILITY[c].canCombineWith.includes(nuevoCargo));
}

/**
 * Calcula el `es_principal` para una lista de cargos docentes activos.
 * El de mayor prioridad gana.
 */
export function resolvePrincipalCargo(cargos: CargoNombre[]): CargoNombre | null {
  if (cargos.length === 0) return null;
  return cargos.reduce((best, current) =>
    CARGO_PRIORIDAD[current] > CARGO_PRIORIDAD[best] ? current : best,
  );
}

/**
 * Computa el array de capabilities efectivas del usuario:
 *   BASE ∪ ROL(rol) ∪ ESPECIALISTA_CARGO(espCargo) ∪ ∪ DOCENTE_CARGO(c) por cada cargo activo.
 */
export function computeEffectivePermissions(
  rol: RoleCode,
  especialistaCargo: EspecialistaCargoEnum | null,
  activeDocenteCargos: CargoNombre[],
): Capability[] {
  const fromRol = ROL_CAPABILITIES[rol] ?? [];
  const fromEsp = especialistaCargo
    ? (ESPECIALISTA_CARGO_CAPABILITIES[especialistaCargo] ?? [])
    : [];
  const fromCargos = activeDocenteCargos.flatMap((c) => DOCENTE_CARGO_CAPABILITIES[c] ?? []);
  return [...new Set([...BASE_CAPABILITIES, ...fromRol, ...fromEsp, ...fromCargos])];
}
