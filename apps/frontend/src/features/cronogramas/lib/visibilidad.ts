import { RoleCode } from '@sistema-monitoreo/shared-contracts';

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
}

export interface CronogramaVisible {
  institucion: string;
  institucionId: string;
  docenteDirectivo: string;
  tipo: 'DOCENTE' | 'DIRECTIVO';
  modalidad?: string;
  nivel: string;
}

/** ¿El cronograma pertenece a la institución del usuario? */
const esDeSuInstitucion = (cronograma: CronogramaVisible, usuario: UsuarioObservador): boolean =>
  !!(
    (usuario.institucion && cronograma.institucionId === usuario.institucion) ||
    (usuario.institucionNombre &&
      cronograma.institucion.toLowerCase() === usuario.institucionNombre.toLowerCase())
  );

/**
 * ¿La visita evalúa al propio usuario?
 *
 * Un director también es evaluado, y esa visita le corresponde ver aunque esté
 * registrada en otra institución. La comparación por inclusión de nombres es
 * histórica y comparte el defecto documentado en
 * `entities/model-cronogramas/evaluador.ts`: un nombre de pila corto puede
 * coincidir de más.
 */
const evaluaAlUsuario = (cronograma: CronogramaVisible, usuario: UsuarioObservador): boolean => {
  if (cronograma.tipo !== 'DIRECTIVO') return false;

  const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`.toLowerCase();
  const evaluado = cronograma.docenteDirectivo.toLowerCase();

  return (
    evaluado.includes(nombreCompleto) ||
    nombreCompleto.includes(evaluado) ||
    evaluado.includes(usuario.nombres.toLowerCase())
  );
};

/** ¿El cronograma cae dentro del nivel que atiende un jefe de área? */
const caeEnSuNivel = (cronograma: CronogramaVisible, nivel: string): boolean => {
  if (cronograma.nivel === nivel) return true;

  const modalidades = MODALIDADES_POR_NIVEL_DE_JEFE[nivel] ?? [];
  return modalidades.includes((cronograma.modalidad ?? '').toUpperCase());
};

/** Filtra la lista a lo que le corresponde ver al usuario. */
export function cronogramasVisibles<T extends CronogramaVisible>(
  cronogramas: readonly T[],
  usuario: UsuarioObservador | null | undefined,
): T[] {
  if (!usuario) return [...cronogramas];

  const esDirector = usuario.role === RoleCode.DIRECTOR_INSTITUCION;
  const esJefeDeArea = usuario.role === RoleCode.JEFE_AREA;

  if (!esDirector && !esJefeDeArea) return [...cronogramas];

  return cronogramas.filter((cronograma) => {
    if (esDirector && !esDeSuInstitucion(cronograma, usuario) && !evaluaAlUsuario(cronograma, usuario)) {
      return false;
    }

    if (esJefeDeArea && usuario.especialistaNivel) {
      return caeEnSuNivel(cronograma, usuario.especialistaNivel);
    }

    return true;
  });
}
