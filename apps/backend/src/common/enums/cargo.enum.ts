/**
 * Nombres de cargo (fuente canónica). Objeto `as const` y no `enum`, como
 * `RoleCode`, para poder compararlos con las cadenas que llegan de la base.
 */
export const CargoNombre = {
  DIRECTOR: 'Director',
  SUBDIRECTOR: 'Subdirector',
  COORDINADOR_PEDAGOGICO: 'Coordinador Pedagógico',
  JEFE_TALLER: 'Jefe de Taller',
  PIP: 'PIP',
  DOCENTE_AULA: 'Docente de Aula',
  ESPECIALISTA: 'Especialista',
  JEFE_AREA: 'Jefe de Área',
  JEFE_GESTION: 'Jefe de Gestión',
} as const;
export type CargoNombre = (typeof CargoNombre)[keyof typeof CargoNombre];
