import { RoleCode } from '../../../common/enums/role.enum.js';

/**
 * La regla: el director de la I.E. define primero el plan del año.
 *
 * El Coordinador Pedagógico y el Jefe de Taller no pueden subir su plan anual,
 * crear su plantilla ni programar cronograma hasta que el director de su I.E.
 * tenga su Plan de Monitoreo Anual activo para el año en curso. El director
 * mismo no está sujeto a la regla: es quien la cumple. La UGEL tampoco.
 *
 * ── Por qué la plantilla ya no cuenta ──
 * Antes se exigían DOS artefactos: el plan y una plantilla vigente del director.
 * Eso venía del modelo en que cada institución armaba sus propias fichas y la
 * del director era la base que el resto clonaba.
 *
 * Hoy las tres fichas de la UGEL son obligatorias y el director puede no crear
 * ninguna plantilla en todo el año: una ficha propia sólo nace de una solicitud
 * que la Jefatura aprueba, y el cupo aprobado es por CARGO. Un cupo del
 * coordinador no depende de que el director tenga plantilla —puede no tener
 * ninguna—, así que exigirla dejaba al coordinador esperando algo que nunca iba
 * a llegar, con su autorización ya concedida.
 *
 * Esta pieza es pura para poder probar el «quién» sin base de datos; la
 * existencia del plan la consulta `PrerrequisitosDirectorService`.
 */

/** Estado del artefacto que el director debe tener listo. */
export interface EstadoPrerrequisitos {
  /** Hay un Plan de Monitoreo Anual activo del director para la I.E. y el año. */
  tienePlan: boolean;
}

/** Si este rol está sujeto a esperar los prerrequisitos del director. */
export function rolRequierePrerrequisitos(role: string): boolean {
  return role === RoleCode.COORDINADOR_PEDAGOGICO || role === RoleCode.JEFE_TALLER;
}

/** Si el director cumplió el requisito. */
export function prerrequisitosCumplidos(estado: EstadoPrerrequisitos): boolean {
  return estado.tienePlan;
}

/**
 * El mensaje que explica qué falta, o cadena vacía si nada falta.
 *
 * Nombra el artefacto ausente para que el coordinador sepa qué pedirle al
 * director, en vez de un «no autorizado» opaco.
 */
export function motivoPrerrequisitosPendientes(estado: EstadoPrerrequisitos): string {
  if (estado.tienePlan) return '';

  return 'El director de la institución aún no ha registrado su Plan de Monitoreo Anual. Debe hacerlo antes de que usted pueda continuar.';
}
