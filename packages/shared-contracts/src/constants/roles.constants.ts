/**
 * Contrato canónico de roles — fuente única de verdad del sistema.
 *
 * Fase 1 de PLAN_REMEDIACION.md.
 *
 * Antes de este archivo existían cuatro declaraciones de rol en el repositorio:
 * el enum `RoleCode` del backend, dos copias literales del tipo `UserRole` en el
 * frontend (`shared/constants/roles.ts` y `entities/model-user/constants.ts`) y
 * un `UserRole` huérfano en `domain.constants.ts` que no correspondía a ninguna
 * realidad del sistema. La duplicación ya había producido deriva observable: las
 * dos copias del frontend rotulaban `director_ugel` de forma distinta.
 *
 * Los valores coinciden con la columna `codigo` de la tabla `Role`, sembrada por
 * `database/seeders/auth.js`. El backend los emite en el JWT desde
 * `auth-token.service.ts`, de modo que este contrato es también el conjunto de
 * valores que el frontend puede recibir.
 *
 * `RoleCode` se declara como objeto `as const` y no como `enum` de TypeScript
 * porque debe consumirse desde ambas aplicaciones: el objeto existe en tiempo de
 * ejecución sin depender de la emisión de enums, y el tipo derivado sigue siendo
 * la unión exacta de sus valores. El acceso `RoleCode.DIRECTOR_UGEL` no cambia.
 *
 * Al agregar un rol, TypeScript señalará todo `Record<RoleCode, …>` incompleto
 * —empezando por `ROL_CAPABILITIES` del backend y `ROLE_LABELS` de aquí—, que es
 * exactamente la propiedad que este contrato existe para garantizar.
 */

/** Códigos de rol. Corresponden a `Role.codigo` en la base de datos. */
export const RoleCode = {
  DIRECTOR_UGEL: 'director_ugel',
  JEFE_AREA: 'jefe_area',
  JEFE_GESTION: 'jefe_gestion',
  ESPECIALISTA: 'especialista',
  DIRECTOR_INSTITUCION: 'director_institucion',
  COORDINADOR_PEDAGOGICO: 'coordinador_pedagogico',
  JEFE_TALLER: 'jefe_taller',
  DOCENTE: 'docente',
  INVITADO: 'invitado',
  SUPERUSUARIO: 'superusuario',
} as const;

export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

/**
 * Alias histórico usado por el frontend. Se conserva para no forzar un renombrado
 * masivo en esta fase; `RoleCode` es el nombre preferido en código nuevo.
 */
export type UserRole = RoleCode;

/** Todos los códigos de rol, en orden jerárquico descendente. */
export const ALL_ROLE_CODES: readonly RoleCode[] = Object.values(RoleCode);

/** Etiqueta legible por persona. Fuente única: no duplicar en las aplicaciones. */
export const ROLE_LABELS: Record<RoleCode, string> = {
  [RoleCode.DIRECTOR_UGEL]: 'Director de UGEL',
  [RoleCode.JEFE_AREA]: 'Jefe de Área',
  [RoleCode.JEFE_GESTION]: 'Jefe de Gestión',
  [RoleCode.ESPECIALISTA]: 'Especialista',
  [RoleCode.DIRECTOR_INSTITUCION]: 'Director de Institución',
  [RoleCode.COORDINADOR_PEDAGOGICO]: 'Coordinador Pedagógico',
  [RoleCode.JEFE_TALLER]: 'Jefe de Taller',
  [RoleCode.DOCENTE]: 'Docente',
  [RoleCode.INVITADO]: 'Invitado',
  [RoleCode.SUPERUSUARIO]: 'Super Administrador',
};

// ── Agrupaciones de roles ────────────────────────────────────────────────────
//
// Hay tres ejes distintos por los que este sistema agrupa roles, y conviene no
// mezclarlos:
//
//   1. ÁMBITO ORGANIZATIVO  — ¿desde qué lado de la organización mira?
//   2. CAPACIDAD DE MUTAR   — ¿puede modificar datos o sólo consultarlos?
//   3. TAREA QUE EJECUTA    — ¿qué hace en terreno? (cruza los ámbitos)
//
// Ninguno es un modelo de autorización: la decisión de si un usuario puede
// ejecutar una acción la toma el mapa de capacidades
// (`capabilities.constants.ts` + `shared/auth/capability-map.ts` del backend).
// Estas agrupaciones responden preguntas que las capacidades no pueden
// responder, como qué variante de una pantalla corresponde mostrar.

/**
 * Ámbito organizativo de un rol — eje 1, y única fuente de esa clasificación.
 *
 * Responde «¿desde qué lado de la organización mira este usuario?», que es una
 * pregunta distinta de «¿qué puede hacer?». Ambas hacen falta: un especialista
 * de UGEL y un director de institución comparten la capacidad
 * `monitoreo:execute`, pero ven pantallas distintas porque su ámbito difiere.
 *
 * Confundir las dos fue el error que produjo las 104 comparaciones literales de
 * rol en la capa de presentación: al no existir vocabulario de ámbito, todo se
 * resolvía enumerando roles.
 */
export type RoleScope = 'ugel' | 'institucion' | 'sin-ambito';

const ROLE_SCOPES: Record<RoleCode, RoleScope> = {
  [RoleCode.DIRECTOR_UGEL]: 'ugel',
  [RoleCode.JEFE_AREA]: 'ugel',
  [RoleCode.JEFE_GESTION]: 'ugel',
  [RoleCode.ESPECIALISTA]: 'ugel',
  [RoleCode.DIRECTOR_INSTITUCION]: 'institucion',
  [RoleCode.COORDINADOR_PEDAGOGICO]: 'institucion',
  [RoleCode.JEFE_TALLER]: 'institucion',
  [RoleCode.DOCENTE]: 'institucion',
  [RoleCode.INVITADO]: 'sin-ambito',
  [RoleCode.SUPERUSUARIO]: 'sin-ambito',
};

/** Ámbito organizativo del rol indicado. */
export function getRoleScope(rol: RoleCode): RoleScope {
  return ROLE_SCOPES[rol];
}

/** ¿El rol pertenece a la UGEL? */
export function isUgelRole(rol: RoleCode): boolean {
  return ROLE_SCOPES[rol] === 'ugel';
}

/** ¿El rol pertenece al personal de una institución educativa? */
export function isInstitutionRole(rol: RoleCode): boolean {
  return ROLE_SCOPES[rol] === 'institucion';
}

/** Roles de un ámbito dado. */
function rolesConAmbito(ambito: RoleScope): readonly RoleCode[] {
  return ALL_ROLE_CODES.filter((rol) => ROLE_SCOPES[rol] === ambito);
}

// Estas dos listas se DERIVAN de `ROLE_SCOPES` en lugar de enumerarse aparte.
// Declararlas a mano las convertía en una segunda fuente de verdad del mismo
// hecho: nada impedía agregar un rol a `UGEL_ROLES` y clasificarlo como
// `institucion` en el mapa de ámbitos, y ambas versiones habrían compilado.

/** Roles con alcance sobre toda la UGEL. */
export const UGEL_ROLES: readonly RoleCode[] = rolesConAmbito('ugel');

/** Roles cuyo alcance se limita a una institución educativa. */
export const INSTITUTION_ROLES: readonly RoleCode[] = rolesConAmbito('institucion');

// ── Eje 2: capacidad de mutar ────────────────────────────────────────────────

/** Roles sin capacidad de mutar datos. */
export const READ_ONLY_ROLES: readonly RoleCode[] = [RoleCode.INVITADO];

// ── Eje 3: tarea que ejecuta ─────────────────────────────────────────────────

/**
 * Roles que ejecutan monitoreos en terreno, visitando aula.
 *
 * **Cruza los dos ámbitos a propósito**: `especialista` pertenece a la UGEL,
 * mientras que `coordinador_pedagogico` y `jefe_taller` son personal de una
 * institución educativa. Lo que comparten no es la pertenencia organizativa sino
 * la tarea: son quienes levantan la ficha en el aula. La capa de presentación ya
 * los agrupaba así —`CalendarioSidebar` los llamaba `isEspecialista`— y ese
 * agrupamiento es correcto para decidir qué vista del calendario mostrar.
 *
 * Tampoco equivale a tener `monitoreo:execute`: el director de institución
 * también la tiene y también firma fichas, pero no comparte el resto de las
 * reglas de este conjunto —por ejemplo, decide sobre solicitudes de
 * reprogramación, y los monitores de campo no—. Donde haga falta agrupar «quien
 * figura como autor de una ficha», que sí lo incluye, hay que componerlo
 * explícitamente en lugar de ampliar este conjunto: ver `ReportesPage.tsx`.
 *
 * Es decir: ni ámbito ni capacidad alcanzan por sí solos para expresar esto, y
 * por eso se declara como un conjunto propio.
 */
export const MONITOR_CAMPO_ROLES: readonly RoleCode[] = [
  RoleCode.ESPECIALISTA,
  RoleCode.COORDINADOR_PEDAGOGICO,
  RoleCode.JEFE_TALLER,
];

/**
 * Verifica en tiempo de ejecución que un valor arbitrario sea un código de rol
 * conocido. Necesario en la frontera con la base de datos: `Role.codigo` es una
 * columna de texto y el backend la convertía con una aserción sin comprobar.
 */
export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === 'string' && (ALL_ROLE_CODES as readonly string[]).includes(value);
}
