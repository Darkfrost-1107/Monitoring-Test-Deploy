import { describe, it, expect } from 'vitest';
import { mensajeDeBusquedaPorDni } from './mensaje-de-dni';
import type { PersonaRoles } from '../hooks/useDniAutocomplete';

/**
 * Lo que se le dice al usuario mientras el sistema busca a alguien por DNI.
 *
 * Estaba en un ternario anidado de cuatro niveles dentro de
 * `useDniAutocomplete`, con su propia enumeración de roles.
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

const persona = (over: Partial<PersonaRoles> = {}) => ({
  nombres: 'Ana',
  apellidos: 'Torres',
  roles: roles(over),
});

describe('mensajeDeBusquedaPorDni', () => {
  it('avisa mientras busca', () => {
    expect(mensajeDeBusquedaPorDni({ buscando: true, persona: null })).toBe('Buscando...');
  });

  it('nombra a la persona encontrada con su rol', () => {
    const mensaje = mensajeDeBusquedaPorDni({
      buscando: false,
      persona: persona({ esDirector: true }),
    });
    expect(mensaje).toContain('Ana Torres');
    expect(mensaje).toContain('Director');
  });

  it('prefiere el cargo del especialista cuando lo tiene', () => {
    const mensaje = mensajeDeBusquedaPorDni({
      buscando: false,
      persona: persona({ esEspecialista: true, especialistaCargoActivo: 'Jefe de Área' }),
    });
    expect(mensaje).toContain('Jefe de Área');
  });

  it('al especialista sin cargo lo nombra «Especialista»', () => {
    const mensaje = mensajeDeBusquedaPorDni({
      buscando: false,
      persona: persona({ esEspecialista: true }),
    });
    expect(mensaje).toContain('Especialista');
  });

  /**
   * Una persona puede estar en el padrón sin ningún rol vigente. Antes el
   * ternario caía en «Registrado en el sistema», que sigue siendo lo correcto.
   */
  it('a quien no tiene rol vigente lo declara registrado', () => {
    const mensaje = mensajeDeBusquedaPorDni({ buscando: false, persona: persona() });
    expect(mensaje).toContain('Registrado en el sistema');
  });

  it('no dice nada cuando no hay búsqueda ni resultado', () => {
    expect(mensajeDeBusquedaPorDni({ buscando: false, persona: null })).toBe('');
  });

  it('mientras busca no muestra el resultado anterior', () => {
    const mensaje = mensajeDeBusquedaPorDni({
      buscando: true,
      persona: persona({ esDirector: true }),
    });
    expect(mensaje).toBe('Buscando...');
  });
});
