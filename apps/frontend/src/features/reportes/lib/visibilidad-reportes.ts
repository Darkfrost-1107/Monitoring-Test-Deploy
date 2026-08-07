import { MONITOR_CAMPO_ROLES, RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Qué reportes ve cada usuario.
 *
 * Fase 6 de PLAN_REMEDIACION.md. `ReportesPage` resolvía esto con cuatro
 * filtros que comparaban **nombres** por inclusión de subcadenas:
 *
 * ```ts
 * visitEspecialista.includes(nombrePila)   // «Ana» coincidía con «Juana»
 * visitSchool.includes(userSchool)         // «IE 123» con «IE 1234»
 * ```
 *
 * Es el mismo patrón que aparece en `puedeEvaluarVisita` y en la visibilidad de
 * cronogramas: tres lugares resolviendo «identificar a una persona» por su
 * nombre. El backend nunca lo hizo así —siempre comparó identificadores— y el
 * frontend lo hacía sólo porque recibía nombres denormalizados. Los datos ya
 * traen los identificadores; estas reglas los usan.
 *
 * ── Qué NO es esto ──
 * No es control de acceso. El endpoint de fichas completadas viene acotado por
 * `scopeFilter.forFicha`, que filtra por `creadoPorId`, `institucionId` y
 * `usuario.id`. Acá se separa lo propio de lo ajeno dentro de lo que ya llegó.
 */

export interface UsuarioDeReportes {
  role: string;
  /** Registro de Docente: identifica a la persona como **evaluada**. */
  docenteId?: string;
  /** Registro de Especialista: la identifica como **evaluadora**. */
  especialistaId?: string;
  /** Institución a la que pertenece, si aplica. */
  institucionId?: string;
}

export interface ReporteVisible {
  id: string;
  /** Especialista que levantó la ficha. */
  monitorId: string;
  /**
   * Docente o directivo evaluado.
   *
   * Opcional porque un cronograma puede no tenerlo resuelto todavía; sin él la
   * visita no puede reconocerse como propia de nadie.
   */
  evaluadoId?: string;
  institucionId: string;
}

/** ¿La visita evalúa a esta persona? */
const evaluaAlUsuario = (reporte: ReporteVisible, usuario: UsuarioDeReportes): boolean =>
  !!usuario.docenteId && !!reporte.evaluadoId && reporte.evaluadoId === usuario.docenteId;

/**
 * Las evaluaciones hechas **a** esta persona: la vista «mis reportes».
 *
 * Sin registro de Docente no hay nada que mostrar: la persona no puede haber
 * sido evaluada.
 */
export function reportesPropios<T extends ReporteVisible>(
  reportes: readonly T[],
  usuario: UsuarioDeReportes | null | undefined,
): T[] {
  if (!usuario?.docenteId) return [];
  return reportes.filter((r) => evaluaAlUsuario(r, usuario));
}

/**
 * Los reportes que corresponden a la vista de monitoreos **realizados**.
 *
 * Excluye siempre lo que evalúa al propio usuario —eso vive en «mis reportes»—
 * y después acota según su papel: quien puede figurar como evaluador ve lo
 * suyo; el director de institución, lo de su colegio.
 */
export function reportesVisibles<T extends ReporteVisible>(
  reportes: readonly T[],
  usuario: UsuarioDeReportes | null | undefined,
): T[] {
  if (!usuario) return [...reportes];

  const ajenos = reportes.filter((r) => !evaluaAlUsuario(r, usuario));

  // El jefe de área se suma a los monitores de campo porque su cargo de
  // especialista le concede `monitoreo:execute` y puede quedar asignado a una
  // visita, igual que ellos.
  const esEvaluadorAsignable =
    (MONITOR_CAMPO_ROLES as readonly string[]).includes(usuario.role) ||
    usuario.role === RoleCode.JEFE_AREA;

  if (esEvaluadorAsignable) {
    if (!usuario.especialistaId) return [];
    return ajenos.filter((r) => r.monitorId === usuario.especialistaId);
  }

  if (usuario.role === RoleCode.DIRECTOR_INSTITUCION) {
    if (!usuario.institucionId) return [];
    return ajenos.filter((r) => r.institucionId === usuario.institucionId);
  }

  return ajenos;
}
