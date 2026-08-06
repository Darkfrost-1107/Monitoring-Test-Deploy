import type { PersonaAutocompleteData, PersonaRoles } from '@features/docentes/hooks/useDniAutocomplete';

/**
 * Rol DESTINO de un formulario de alta — no es el rol de un usuario autenticado.
 *
 * Modela un eje distinto de `RoleCode` y por eso se declara por separado en
 * lugar de derivarse del contrato compartido: aquí `director` significa "la
 * persona que se está dando de alta como director de I.E.", mientras que
 * `RoleCode.DIRECTOR_INSTITUCION` es la identidad con la que alguien inicia
 * sesión. Los valores se solapan parcialmente por coincidencia del dominio, no
 * porque sean el mismo concepto.
 *
 * Distinción registrada en la Fase 1 de PLAN_REMEDIACION.md para que no se
 * confunda con `RoleCode` ni se intente unificar sin analizar el dominio.
 */
export type RolObjetivo = 'director' | 'docente' | 'especialista' | 'jefe_area' | 'jefe_gestion';

export interface RoleCheckResult {
  bloquea: boolean;
  advierte: boolean;
  mensaje: string;
  detalle?: string;
}

const tieneDirector = (r: PersonaRoles): boolean => r.esDirector;
const tieneDocenteAula = (r: PersonaRoles): boolean =>
  r.esDocenteAula || r.esCoordinadorPedagogico || r.esJefeTaller;
const tieneAlgunaDocencia = (r: PersonaRoles): boolean =>
  r.esDocente || r.esDirector || r.esCoordinadorPedagogico || r.esJefeTaller;
const tieneEspecialista = (r: PersonaRoles, cargoObjetivo?: string): boolean => {
  if (!r.esEspecialista) return false;
  if (!cargoObjetivo) return true;
  return r.especialistaCargoActivo === cargoObjetivo;
};

export const checkRoleConflict = (
  persona: PersonaAutocompleteData | null,
  rolObjetivo: RolObjetivo,
  cargoObjetivo?: string,
): RoleCheckResult => {
  if (!persona) {
    return { bloquea: false, advierte: false, mensaje: '' };
  }
  const r = persona.roles;

  switch (rolObjetivo) {
    case 'director':
      if (tieneDirector(r)) {
        return {
          bloquea: true,
          advierte: false,
          mensaje: 'Esta persona ya está registrada como Director de I.E.',
          detalle: 'No se puede crear un nuevo registro de Director para el mismo DNI.',
        };
      }
      if (tieneDocenteAula(r)) {
        return {
          bloquea: false,
          advierte: true,
          mensaje: 'Esta persona ya es docente en otra Institución (o con otro cargo).',
          detalle:
            'Si continúa, se actualizará su perfil para trasladarlo a esta nueva Institución Educativa con el cargo de Director.',
        };
      }
      if (r.esEspecialista) {
        return {
          bloquea: false,
          advierte: true,
          mensaje: `Esta persona ya está registrada como ${r.especialistaCargoActivo ?? 'Especialista'}.`,
          detalle: 'Si continúa, se le asignará adicionalmente el cargo directivo.',
        };
      }
      return { bloquea: false, advierte: false, mensaje: '' };

    case 'docente':
      if (r.esDocente) {
        const cargosTxt = r.docenteCargosActivos.length
          ? r.docenteCargosActivos.join(', ')
          : 'docente';
        return {
          bloquea: true,
          advierte: false,
          mensaje: `Esta persona ya está registrada como docente (${cargosTxt}).`,
          detalle: 'No se puede crear un nuevo registro de Docente para el mismo DNI.',
        };
      }
      if (r.esEspecialista) {
        return {
          bloquea: false,
          advierte: true,
          mensaje: `Esta persona ya está registrada como ${r.especialistaCargoActivo ?? 'Especialista'}.`,
          detalle: 'Se creará además un registro como Docente de Aula.',
        };
      }
      return { bloquea: false, advierte: false, mensaje: '' };

    case 'especialista':
    case 'jefe_area':
    case 'jefe_gestion':
      if (r.esEspecialista && !tieneEspecialista(r, cargoObjetivo)) {
        return {
          bloquea: true,
          advierte: false,
          mensaje: `Esta persona ya está registrada como ${r.especialistaCargoActivo ?? 'Especialista'} con otro cargo.`,
          detalle: 'No se puede duplicar el registro. Un Especialista solo puede tener un cargo activo a la vez.',
        };
      }
      if (tieneEspecialista(r, cargoObjetivo)) {
        return {
          bloquea: true,
          advierte: false,
          mensaje: `Esta persona ya está registrada como ${cargoObjetivo ?? r.especialistaCargoActivo ?? 'Especialista'}.`,
          detalle: 'No se puede crear un nuevo registro con este cargo para el mismo DNI.',
        };
      }
      if (tieneAlgunaDocencia(r)) {
        return {
          bloquea: false,
          advierte: true,
          mensaje: 'Esta persona ya es docente/director en el sistema.',
          detalle: `Se creará además un registro como ${cargoObjetivo ?? 'Especialista'}.`,
        };
      }
      return { bloquea: false, advierte: false, mensaje: '' };
  }
};
