/**
 * En Secundaria el monitoreo es POR ÁREA: un especialista sólo evalúa a docentes
 * de una especialidad que él mismo maneja (un especialista de Matemática no
 * monitorea a un docente de Comunicación). En Inicial y Primaria no hay áreas
 * curriculares que separar, y en la visita directiva se evalúa la conducción de
 * la institución, no una materia; en esos casos la regla no aplica.
 *
 * ── A quién NO se le aplica ──
 * La regla es del ESPECIALISTA de la UGEL, que se asigna por área. Dentro de una
 * institución, el Coordinador Pedagógico y el Jefe de Taller se rigen por otra
 * cosa: su cartera de docentes asignados, que al armarse ya contempla la
 * especialidad. Y el Director evalúa a todo su personal.
 *
 * Ninguno de esos tres tiene registro de especialista, así que su lista de áreas
 * llega vacía —y una lista vacía no comparte especialidad con nadie—. Aplicarles
 * esta regla les impedía programar cualquier visita en una I.E. de Secundaria,
 * con la cartera correctamente cargada detrás.
 *
 * La decisión es pura para probarla sin base de datos; las especialidades de cada
 * actor las resuelve el repositorio.
 */

/** Nombre de especialidad comparable: sin tildes, sin mayúsculas, sin bordes. */
const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Roles que programan dentro de su institución y no se rigen por área.
 *
 * Se enumeran acá, junto a la regla, para que quien la lea vea de una a quién
 * alcanza y a quién no.
 */
const ROLES_DE_INSTITUCION: readonly string[] = [
  'director_institucion',
  'coordinador_pedagogico',
  'jefe_taller',
];

/**
 * ¿La asignación exige que monitor y docente compartan especialidad?
 *
 * `rolDelMonitor` es opcional para no romper a quien todavía no lo pasa; sin él
 * la regla se comporta como antes. Los llamadores nuevos deben pasarlo.
 */
export function requiereEspecialidadCompartida(
  nivel: string,
  tipoMonitoreo: string,
  rolDelMonitor?: string,
): boolean {
  if (rolDelMonitor && ROLES_DE_INSTITUCION.includes(rolDelMonitor)) return false;
  return norm(nivel) === 'secundaria' && tipoMonitoreo === 'DOCENTE';
}

/** ¿Alguna especialidad del docente está entre las que maneja el especialista? */
export function compartenEspecialidad(
  especialidadesMonitor: readonly string[],
  especialidadesDocente: readonly string[],
): boolean {
  const delMonitor = new Set(especialidadesMonitor.map(norm));
  return especialidadesDocente.some((e) => delMonitor.has(norm(e)));
}
