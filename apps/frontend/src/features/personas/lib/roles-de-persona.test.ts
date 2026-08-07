import { describe, it, expect } from 'vitest';
import { rolesDeclarados } from './roles-de-persona';
import type { PersonaRoles } from '@features/docentes/hooks/useDniAutocomplete';

/**
 * Los roles que ya tiene una persona, para poder decírselo a quien está por
 * darle uno más. La enumeración estaba escrita tres veces —en los formularios
 * de docente, especialista y director— dentro de un modal idéntico palabra por
 * palabra en los tres.
 */

const roles = (over: Partial<PersonaRoles> = {}): PersonaRoles => ({
  esDocente: false,
  docenteInstitucionId: null,
  docenteNivelEducativo: null,
  docenteCargosActivos: [],
  esDirector: false,
  esCoordinadorPedagogico: false,
  esJefeTaller: false,
  esDocenteAula: false,
  esEspecialista: false,
  especialistaCargoActivo: null,
  especialistaNivelEducativo: null,
  especialistaModalidad: null,
  especialistaEstado: null,
  ...over,
});

describe('rolesDeclarados', () => {
  it('nombra cada rol de institución que la persona tiene', () => {
    const lista = rolesDeclarados(
      roles({ esDirector: true, esCoordinadorPedagogico: true, esJefeTaller: true, esDocenteAula: true }),
    );
    expect(lista).toEqual([
      'Director de I.E.',
      'Coordinador Pedagógico',
      'Jefe de Taller',
      'Docente de Aula',
    ]);
  });

  it('no nombra los que no tiene', () => {
    expect(rolesDeclarados(roles({ esDocenteAula: true }))).toEqual(['Docente de Aula']);
  });

  it('al especialista lo nombra con su cargo y su nivel', () => {
    const lista = rolesDeclarados(
      roles({
        esEspecialista: true,
        especialistaCargoActivo: 'Jefe de Área',
        especialistaNivelEducativo: 'Primaria',
      }),
    );
    expect(lista).toEqual(['Jefe de Área (Primaria)']);
  });

  /**
   * El cargo o el nivel pueden faltar. Antes se interpolaban tal cual y el
   * modal mostraba «null (null)» a quien tenía que decidir si sumar un rol.
   */
  it('sin cargo lo nombra «Especialista» a secas', () => {
    expect(rolesDeclarados(roles({ esEspecialista: true }))).toEqual(['Especialista']);
  });

  it('sin nivel omite el paréntesis en vez de escribir «null»', () => {
    const lista = rolesDeclarados(
      roles({ esEspecialista: true, especialistaCargoActivo: 'Jefe de Gestión' }),
    );
    expect(lista).toEqual(['Jefe de Gestión']);
  });

  it('sin ningún rol declarado devuelve la lista vacía', () => {
    expect(rolesDeclarados(roles())).toEqual([]);
  });
});
