import type { PersonaRoles } from '@features/docentes/hooks/useDniAutocomplete';

/**
 * Los roles que una persona ya tiene, en texto.
 *
 * La enumeración estaba escrita tres veces —en los formularios de docente,
 * especialista y director— dentro de un modal idéntico palabra por palabra en
 * los tres. Es lo que se le muestra a quien está por darle un rol más, así que
 * lo que falte tiene que verse como ausencia y no como «null».
 */

/** Roles de institución educativa, en el orden en que se enumeran. */
const ROLES_DE_INSTITUCION: { campo: keyof PersonaRoles; nombre: string }[] = [
  { campo: 'esDirector', nombre: 'Director de I.E.' },
  { campo: 'esCoordinadorPedagogico', nombre: 'Coordinador Pedagógico' },
  { campo: 'esJefeTaller', nombre: 'Jefe de Taller' },
  { campo: 'esDocenteAula', nombre: 'Docente de Aula' },
];

export function rolesDeclarados(roles: PersonaRoles): string[] {
  const declarados = ROLES_DE_INSTITUCION.filter(({ campo }) => roles[campo]).map(
    ({ nombre }) => nombre,
  );

  if (roles.esEspecialista) {
    const cargo = roles.especialistaCargoActivo || 'Especialista';
    const nivel = roles.especialistaNivelEducativo;
    declarados.push(nivel ? `${cargo} (${nivel})` : cargo);
  }

  return declarados;
}
