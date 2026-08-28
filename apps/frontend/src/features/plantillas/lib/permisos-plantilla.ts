import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { esDeUgel, type PlantillaVisible } from './visibilidad-plantillas';

/**
 * Qué puede hacer el usuario con cada plantilla del catálogo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estas condiciones se calculaban dentro del
 * `map` que dibuja las tarjetas, en expresiones booleanas de cinco términos sin
 * nombre ni prueba.
 *
 * ── Qué NO es esto ──
 * No es control de acceso: decide qué botones se dibujan. El backend valida
 * cada operación por su cuenta.
 */

export interface PlantillaGestionable extends PlantillaVisible {
  /** Usuario que la creó. */
  creadoPorId?: string;
  /**
   * Instrumento tipado. Se compara contra el del cupo aprobado: cada
   * autorización se concedió para una ficha concreta, no para «una plantilla».
   */
  instrumento?: string;
}

export interface UsuarioDeGestion {
  id?: string;
  role: string;
  /** Identificador de la institución del usuario, no su nombre. */
  institucion?: string;
}

export interface AlcanceDeGestion {
  /** El usuario opera desde el lado de una institución educativa. */
  isInstitution: boolean;
  isMonitorCampo: boolean;
}

/** ¿La plantilla pertenece a la institución del usuario? */
const esDeSuInstitucion = (p: PlantillaGestionable, usuario: UsuarioDeGestion): boolean =>
  !!usuario.institucion && p.ieId === usuario.institucion;

/**
 * ¿Puede editarla, clonarla, cambiarle el estado o eliminarla?
 *
 * Desde el lado de una institución sólo se gestiona lo propio: el director, las
 * plantillas de su I.E.; cualquier otra persona, las que ella misma creó dentro
 * de su I.E. Desde el lado de la UGEL se gestionan las de la UGEL.
 */
export function puedeGestionar(
  plantilla: PlantillaGestionable,
  usuario: UsuarioDeGestion | null | undefined,
  alcance: AlcanceDeGestion,
): boolean {
  if (!usuario) return false;

  if (!alcance.isInstitution) return esDeUgel(plantilla);

  const esDelDirectorDeSuIE =
    usuario.role === RoleCode.DIRECTOR_INSTITUCION &&
    plantilla.creadoPorRole === 'director_ie' &&
    esDeSuInstitucion(plantilla, usuario);

  const laCreoElUsuario =
    !!usuario.id && plantilla.creadoPorId === usuario.id && esDeSuInstitucion(plantilla, usuario);

  return esDelDirectorDeSuIE || laCreoElUsuario;
}

/**
 * ¿Puede clonar una plantilla del director de su institución?
 *
 * Es la salida para el monitor de campo destacado en una I.E.: no puede tocar
 * la plantilla del director, pero sí partir de ella. No aplica a las que él
 * mismo creó, porque ésas ya las gestiona.
 */
export function puedeClonarLaDelDirector(
  plantilla: PlantillaGestionable,
  usuario: UsuarioDeGestion | null | undefined,
  alcance: AlcanceDeGestion,
): boolean {
  if (!usuario) return false;

  return (
    alcance.isMonitorCampo &&
    alcance.isInstitution &&
    plantilla.creadoPorRole === 'director_ie' &&
    esDeSuInstitucion(plantilla, usuario) &&
    plantilla.creadoPorId !== usuario.id
  );
}

/**
 * ¿Se le ofrece copiar una plantilla de la UGEL para su institución?
 *
 * Es la acción exclusiva del director sobre el material de la UGEL: en lugar de
 * editarlo, se lleva una copia propia.
 */
/**
 * Si esta persona puede copiar la ficha oficial para su institución.
 *
 * ── Por qué exige un cupo y no sólo el rol ──
 * El catálogo de la UGEL es obligatorio: una institución monitorea con las
 * fichas oficiales y no necesita copiarlas para eso. Copiar sirve únicamente
 * para materializar una plantilla que la Jefatura ya aprobó, y el servidor lo
 * exige al duplicar.
 *
 * Mostrar el botón sin mirar los cupos era prometer lo que el servidor
 * rechazaba: se pulsaba y devolvía 403.
 *
 * El cupo debe coincidir en INSTRUMENTO, porque cada uno se aprobó para una
 * ficha concreta. El cargo lo verifica el backend contra la sesión; acá no
 * hace falta repetirlo, ya que los cupos que llegan son los de esta persona.
 */
export function puedeCopiarParaSuInstitucion(
  plantilla: PlantillaGestionable,
  usuario: UsuarioDeGestion | null | undefined,
  cuposLibres: readonly { instrumento: string }[] = [],
): boolean {
  if (!esDeUgel(plantilla)) return false;
  if (!ROLES_QUE_CREAN_EN_LA_IE.includes(usuario?.role as RoleCode)) return false;

  return cuposLibres.some((cupo) => cupo.instrumento === plantilla.instrumento);
}

/**
 * Quiénes crean plantillas dentro de una institución.
 *
 * Antes era sólo el director. El jefe de taller y el coordinador pedagógico no
 * PIDEN —eso lo tramita el director por todos—, pero sí crean la plantilla que
 * se aprobó para su cargo.
 */
const ROLES_QUE_CREAN_EN_LA_IE: readonly RoleCode[] = [
  RoleCode.DIRECTOR_INSTITUCION,
  RoleCode.COORDINADOR_PEDAGOGICO,
  RoleCode.JEFE_TALLER,
];
