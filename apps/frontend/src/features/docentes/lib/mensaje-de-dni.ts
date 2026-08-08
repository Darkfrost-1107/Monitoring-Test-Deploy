import type { PersonaRoles } from '../hooks/useDniAutocomplete';

/**
 * Lo que se le dice al usuario mientras el sistema busca a alguien por DNI.
 *
 * Estaba en un ternario anidado de cuatro niveles dentro de
 * `useDniAutocomplete`, con su propia enumeración de roles.
 */

interface Estado {
  buscando: boolean;
  persona: { nombres: string; apellidos: string; roles: PersonaRoles } | null;
}

/** Cómo se nombra el rol vigente de la persona encontrada. */
function rolVigente(roles: PersonaRoles): string {
  if (roles.esDirector) return 'Director';
  if (roles.esDocenteAula) return 'Docente';
  if (roles.esEspecialista) return roles.especialistaCargoActivo || 'Especialista';

  return 'Registrado en el sistema';
}

export function mensajeDeBusquedaPorDni({ buscando, persona }: Estado): string {
  // Mientras busca no se muestra el resultado anterior: sería afirmar que
  // encontró a alguien que todavía no confirmó.
  if (buscando) return 'Buscando...';
  if (!persona) return '';

  return `Persona encontrada: ${persona.nombres} ${persona.apellidos} (${rolVigente(persona.roles)}). Datos autocompletados.`;
}
