import { RoleCode } from '../../../common/enums/role.enum.js';

/**
 * La regla: el director de la I.E. es el primero en definir el monitoreo.
 *
 * El Coordinador Pedagógico y el Jefe de Taller no pueden subir su plan anual,
 * crear su plantilla ni programar cronograma hasta que el director de su I.E.
 * haya subido su Plan de Monitoreo Anual (activo) Y definido su plantilla
 * (vigente), ambos del año en curso. El director sube primero; el resto del
 * personal de la institución trabaja sobre esa base.
 *
 * El director mismo no está sujeto a la regla: es quien la cumple. La UGEL
 * tampoco. Esta pieza es pura para poder probar el «quién» sin base de datos; la
 * existencia de los dos artefactos la consulta `PrerrequisitosDirectorService`.
 */

/** Estado de los dos artefactos que el director debe tener listos. */
export interface EstadoPrerrequisitos {
  /** Hay un Plan de Monitoreo Anual activo del director para la I.E. y el año. */
  tienePlan: boolean;
  /** Hay una plantilla vigente del director para la I.E. y el año. */
  tienePlantilla: boolean;
}

/** Si este rol está sujeto a esperar los prerrequisitos del director. */
export function rolRequierePrerrequisitos(role: string): boolean {
  return role === RoleCode.COORDINADOR_PEDAGOGICO || role === RoleCode.JEFE_TALLER;
}

/** Si el director cumplió los dos requisitos. */
export function prerrequisitosCumplidos(estado: EstadoPrerrequisitos): boolean {
  return estado.tienePlan && estado.tienePlantilla;
}

/**
 * El mensaje que explica qué falta, o cadena vacía si nada falta.
 *
 * Nombra el o los artefactos ausentes para que el coordinador sepa qué pedirle
 * al director, en vez de un «no autorizado» opaco.
 */
export function motivoPrerrequisitosPendientes(estado: EstadoPrerrequisitos): string {
  const faltan: string[] = [];
  if (!estado.tienePlan) faltan.push('su Plan de Monitoreo Anual');
  if (!estado.tienePlantilla) faltan.push('su plantilla de monitoreo');

  if (faltan.length === 0) return '';

  return `El director de la institución aún no ha registrado ${faltan.join(' ni ')}. Debe hacerlo antes de que usted pueda continuar.`;
}
