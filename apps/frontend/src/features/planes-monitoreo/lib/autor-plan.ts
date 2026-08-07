/**
 * Quién subió el plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. La tabla de cargos y su lectura vivían al tope
 * de `PlanMonitoreoAnualPage`, y la línea que las combina con el nombre del
 * autor estaba escrita dos veces: una en la vista de cuadrícula y otra en la de
 * lista.
 */

const CARGO_POR_ROL: Record<string, string> = {
  director_ie: 'Director de IE',
  coordinador_pedagogico: 'Coordinador Pedagógico',
  jefe_taller: 'Jefe de Taller',
  jefe_gestion: 'Jefe de Gestión',
};

/**
 * El cargo del autor, o `null` si el plan no lo registra.
 *
 * Un rol que no está en la tabla se muestra tal cual: es preferible a ocultarlo,
 * porque deja ver que falta traducirlo.
 */
export const cargoDelAutor = (rol: string | null | undefined): string | null =>
  rol ? (CARGO_POR_ROL[rol] ?? rol) : null;

/**
 * Cargo y nombre del autor: `Director de IE — Ana Quispe`.
 *
 * Devuelve `null` cuando no hay cargo registrado, que es la condición que usan
 * ambas vistas para decidir si muestran la línea.
 */
export function descripcionDelAutor(
  rol: string | null | undefined,
  nombre: string | null | undefined,
): string | null {
  const cargo = cargoDelAutor(rol);
  if (!cargo) return null;

  return nombre ? `${cargo} — ${nombre}` : cargo;
}
