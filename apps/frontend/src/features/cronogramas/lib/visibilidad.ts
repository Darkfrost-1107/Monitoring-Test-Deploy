import { RoleCode, MONITOR_CAMPO_ROLES } from '@sistema-monitoreo/shared-contracts';
import { esDeLaInstitucionDelUsuario } from '@shared/lib/pertenencia-institucional';

/**
 * Qué cronogramas ve cada usuario en pantalla.
 *
 * Fase 5 de PLAN_REMEDIACION.md. La regla estaba escrita dos veces —en
 * `CronogramaPage` y en `CalendarioPage`— y las copias no coincidían: la de
 * cronogramas comparaba la institución sólo por nombre, la del calendario
 * también por identificador. Dos pantallas discrepando sobre qué ve el mismo
 * director, que es justamente lo que pasa cuando una regla vive duplicada.
 *
 * ── Qué NO es esto ──
 * No es el control de acceso: el backend aplica RLS sobre las mismas filas.
 * Acá se decide qué se muestra, para no llenar la tabla de visitas que no le
 * corresponden a quien mira.
 */

/**
 * Modalidades que atiende un jefe de área además de su nivel homónimo.
 *
 * `SECUNDARIA` figura como modalidad por precaución: no es una de las
 * declaradas en el contrato, pero la comprobación original la aceptaba y se
 * conserva para no dejar afuera registros heredados que la traigan.
 */
const MODALIDADES_POR_NIVEL_DE_JEFE: Record<string, string[]> = {
  Inicial: ['EBE'],
  Primaria: [],
  Secundaria: ['SECUNDARIA', 'EBA', 'CEPTRO'],
};

export interface UsuarioObservador {
  role: string;
  nombres: string;
  apellidos: string;
  /** Identificador de su institución, si pertenece a una. */
  institucion?: string;
  /** Nombre de su institución, respaldo cuando no hay identificador. */
  institucionNombre?: string;
  /** Nivel educativo que atiende, cuando el rol lo acota. */
  especialistaNivel?: string;
  /** Identificador del especialista vinculado; reconoce las visitas que monitorea. */
  especialistaId?: string;
  /** Identificador del docente vinculado; reconoce las visitas en las que lo evalúan. */
  docenteId?: string;
}

export interface CronogramaVisible {
  institucion: string;
  institucionId: string;
  docenteDirectivo: string;
  tipo: import('@sistema-monitoreo/shared-contracts').TipoMonitoreo;
  modalidad?: string;
  nivel: string;
  /** Especialista asignado a la visita. */
  monitorId: string;
  /** Persona a la que la visita evalúa. */
  evaluadoId?: string;
}

/** ¿El cronograma pertenece a la institución del usuario? */
const esDeSuInstitucion = (cronograma: CronogramaVisible, usuario: UsuarioObservador): boolean =>
  esDeLaInstitucionDelUsuario(usuario, cronograma);

/**
 * ¿La visita evalúa al propio usuario?
 *
 * Un director también es evaluado, y esa visita le corresponde ver aunque esté
 * registrada en otra institución. Se reconoce por `evaluado_id`, columna no
 * nula con clave foránea, contra el `docente_id` que el token ya trae. Antes se
 * comparaban los nombres por inclusión de subcadenas, con el mismo falso
 * positivo que se retiró de `puedeEvaluarVisita`: «Ana Torres» quedaba
 * incluida en una visita a «Juana Pérez».
 */
const evaluaAlUsuario = (cronograma: CronogramaVisible, usuario: UsuarioObservador): boolean =>
  cronograma.tipo === 'DIRECTIVO' &&
  !!usuario.docenteId &&
  cronograma.evaluadoId === usuario.docenteId;

/**
 * ¿El cronograma cae dentro del nivel que atiende un jefe de área?
 *
 * La comparación de nivel se hace sin distinguir mayúsculas. Se comparaba
 * exacto, de modo que un «SECUNDARIA» guardado en la visita no coincidía con el
 * «Secundaria» del perfil y el jefe de área no veía **ninguno** de sus
 * cronogramas, ni los que acababa de registrar. La modalidad, dos líneas más
 * abajo, ya se normalizaba.
 */
const caeEnSuNivel = (cronograma: CronogramaVisible, nivel: string): boolean => {
  if (cronograma.nivel?.toUpperCase() === nivel.toUpperCase()) return true;

  const modalidades = MODALIDADES_POR_NIVEL_DE_JEFE[nivel] ?? [];
  return modalidades.includes((cronograma.modalidad ?? '').toUpperCase());
};

/** Filtra la lista a lo que le corresponde ver al usuario. */
export function cronogramasVisibles<T extends CronogramaVisible>(
  cronogramas: readonly T[],
  usuario: UsuarioObservador | null | undefined,
): T[] {
  if (!usuario) return [...cronogramas];

  // Quien levanta la ficha en el aula como monitor de campo ve lo que tiene
  // asignado, y también la visita donde él mismo es el evaluado.
  // El subdirector, como directivo de la institución, accede al cronograma institucional
  // de su colegio bajo reglas jerárquicas (definidas más abajo).
  if (
    (MONITOR_CAMPO_ROLES as readonly string[]).includes(usuario.role) &&
    usuario.role !== RoleCode.SUBDIRECTOR
  ) {
    return cronogramas.filter(
      (c) =>
        (!!usuario.especialistaId && c.monitorId === usuario.especialistaId) ||
        (!!usuario.docenteId && !!c.evaluadoId && c.evaluadoId === usuario.docenteId),
    );
  }

  const esDirector = usuario.role === RoleCode.DIRECTOR_INSTITUCION;
  const esSubdirector = usuario.role === RoleCode.SUBDIRECTOR;
  const esJefeDeArea = usuario.role === RoleCode.JEFE_AREA;

  if (!esDirector && !esSubdirector && !esJefeDeArea) return [...cronogramas];

  return cronogramas.filter((cronograma) => {
    if (esDirector && !esDeSuInstitucion(cronograma, usuario) && !evaluaAlUsuario(cronograma, usuario)) {
      return false;
    }

    if (esSubdirector) {
      if (!esDeSuInstitucion(cronograma, usuario) && !evaluaAlUsuario(cronograma, usuario)) {
        return false;
      }
      // Jerarquía: ve la programación pedagógica de su I.E., pero no visitas directivas
      // que evalúan a su superior (el Director de la I.E.), a menos que él sea el evaluado.
      if (cronograma.tipo === 'DIRECTIVO' && cronograma.evaluadoId !== usuario.docenteId) {
        return false;
      }
      return true;
    }

    if (esJefeDeArea && usuario.especialistaNivel) {
      return caeEnSuNivel(cronograma, usuario.especialistaNivel);
    }

    return true;
  });
}
