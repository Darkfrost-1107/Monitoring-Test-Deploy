/**
 * En Secundaria el monitoreo es POR ÁREA: un especialista sólo evalúa a docentes
 * de una especialidad que él mismo maneja (un especialista de Matemática no
 * monitorea a un docente de Comunicación). En Inicial y Primaria no hay áreas
 * curriculares que separar, y en la visita directiva se evalúa la conducción de
 * la institución, no una materia; en esos casos la regla no aplica.
 *
 * La decisión es pura para probarla sin base de datos; las especialidades de cada
 * actor las resuelve el repositorio.
 */

/** Nombre de especialidad comparable: sin tildes, sin mayúsculas, sin bordes. */
const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** ¿La asignación exige que especialista y docente compartan especialidad? */
export function requiereEspecialidadCompartida(nivel: string, tipoMonitoreo: string): boolean {
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
