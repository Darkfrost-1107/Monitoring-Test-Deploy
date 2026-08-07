import { ModalidadEducativa, RoleCode } from '@sistema-monitoreo/shared-contracts';
import { MODALIDAD_NIVEL_MAP } from '@entities/model-instituciones';

/**
 * Cascada de asignación de un cronograma de monitoreo.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estas cuatro reglas vivían como `useMemo`
 * dentro de `CronogramaPage`, un componente de 1.446 líneas, entre la
 * maquetación del formulario. Deciden quién puede monitorear qué, y no tenían
 * cobertura: una asignación equivocada no falla, produce una visita que la
 * persona equivocada no puede levantar.
 *
 * El orden de la cascada es modalidad → nivel → especialista e institución.
 * Cambiar un eslabón invalida los siguientes.
 */

const TODAS_LAS_MODALIDADES = Object.values(ModalidadEducativa);

/** Cargos de la UGEL que salen a monitorear. */
const CARGOS_QUE_MONITOREAN = ['Especialista', 'Jefe de Gestión'];

/** Modalidad que se asume cuando el especialista no la declara. */
const MODALIDAD_POR_DEFECTO = 'EBR';

/** Modalidades a las que accede un jefe de área, según el nivel que atiende. */
const MODALIDADES_POR_NIVEL_DE_JEFE: Record<string, string[]> = {
  Inicial: ['EBR', 'EBE'],
  Primaria: ['EBR'],
  Secundaria: ['EBR', 'EBA', 'CEPTRO'],
};

export interface UsuarioAsignador {
  role: string;
  /** Nivel educativo que atiende, cuando el rol lo acota. */
  especialistaNivel?: string;
  /** Identificador del especialista vinculado, si lo tiene. */
  especialistaId?: string;
}

export interface EspecialistaAsignable {
  id: string;
  cargo: string;
  activo?: boolean;
  nivelEducativo: string;
  modalidad?: string;
  especialidades?: string[];
}

export interface InstitucionAsignable {
  id: string;
  modalidad: string;
  nivelEducativo: string;
  estado?: string;
  activo?: boolean;
}

/**
 * Modalidades que el usuario puede programar.
 *
 * Sólo el jefe de área queda acotado, y por el nivel que atiende. Sin nivel
 * asignado no se le restringe: sería dejarlo sin poder programar nada.
 */
export function modalidadesPermitidas(usuario: UsuarioAsignador | null | undefined): string[] {
  if (usuario?.role !== RoleCode.JEFE_AREA || !usuario.especialistaNivel) {
    return [...TODAS_LAS_MODALIDADES];
  }
  return MODALIDADES_POR_NIVEL_DE_JEFE[usuario.especialistaNivel] ?? [];
}

/**
 * Niveles que ofrece una modalidad.
 *
 * La restricción del jefe de área se aplica sólo dentro de EBR: las demás
 * modalidades tienen su propia estructura de niveles y no se corresponden una a
 * una con la de educación básica regular.
 */
export function nivelesPermitidos(
  modalidad: string,
  usuario: UsuarioAsignador | null | undefined,
): string[] {
  if (!modalidad) return [];

  const niveles = MODALIDAD_NIVEL_MAP[modalidad] ?? [];

  if (
    usuario?.role === RoleCode.JEFE_AREA &&
    usuario.especialistaNivel &&
    modalidad === MODALIDAD_POR_DEFECTO
  ) {
    return niveles.filter((nivel) => nivel === usuario.especialistaNivel);
  }

  return [...niveles];
}

/**
 * ¿El especialista cubre esta modalidad y nivel?
 *
 * Dos modalidades no se resuelven por correspondencia directa:
 * - **CEPTRO** es educación técnico-productiva: exige alguien de Secundaria con
 *   la especialidad EPT, venga de la modalidad que venga.
 * - **EBA y EBE** se cubren con especialistas de Inicial o Primaria, con
 *   independencia del nivel que pida el cronograma.
 */
const cubreModalidadYNivel = (
  especialista: EspecialistaAsignable,
  modalidad: string,
  nivel: string,
): boolean => {
  if (modalidad === 'CEPTRO') {
    return (
      especialista.nivelEducativo === 'Secundaria' &&
      !!especialista.especialidades?.includes('EPT')
    );
  }

  if (modalidad === 'EBA' || modalidad === 'EBE') {
    return especialista.nivelEducativo === 'Primaria' || especialista.nivelEducativo === 'Inicial';
  }

  return (
    (especialista.modalidad || MODALIDAD_POR_DEFECTO) === modalidad &&
    especialista.nivelEducativo === nivel
  );
};

/**
 * Especialistas que pueden quedar asignados a una visita.
 *
 * Genérica en el tipo de especialista para devolver los mismos objetos que
 * recibe: la regla sólo lee los campos declarados acá, pero quien la llama
 * necesita el registro completo para renderizar el selector.
 */
export function especialistasAsignables<T extends EspecialistaAsignable>(
  especialistas: readonly T[],
  modalidad: string,
  nivel: string,
  usuario: UsuarioAsignador | null | undefined,
): T[] {
  if (!modalidad || !nivel) return [];

  return especialistas.filter((especialista) => {
    if (especialista.activo !== true) return false;
    if (!CARGOS_QUE_MONITOREAN.includes(especialista.cargo)) return false;

    // Un jefe de gestión puede asignarse a sí mismo, pero no a otro par: la
    // carga de trabajo de un jefe la decide él, no un colega.
    const esOtroJefe =
      especialista.cargo === 'Jefe de Gestión' && especialista.id !== usuario?.especialistaId;
    if (esOtroJefe) return false;

    return cubreModalidadYNivel(especialista, modalidad, nivel);
  });
}

/**
 * Instituciones que pueden recibir la visita.
 *
 * Conviven dos formas de marcar vigencia —`estado` y `activo`—; basta con una.
 */
export function institucionesAsignables<T extends InstitucionAsignable>(
  instituciones: readonly T[],
  modalidad: string,
  nivel: string,
): T[] {
  if (!modalidad || !nivel) return [];

  return instituciones.filter(
    (institucion) =>
      institucion.modalidad === modalidad &&
      institucion.nivelEducativo === nivel &&
      (institucion.estado === 'Activa' || institucion.activo === true),
  );
}
