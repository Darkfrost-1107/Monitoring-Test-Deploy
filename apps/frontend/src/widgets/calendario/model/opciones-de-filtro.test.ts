import { describe, it, expect } from 'vitest';
import { opcionesDeFiltro, TODOS } from './opciones-de-filtro';

const visita = (over: Partial<Parameters<typeof opcionesDeFiltro>[0][number]> = {}) => ({
  especialista: 'Ana Torres',
  modalidad: 'EBR',
  nivel: 'Primaria',
  ...over,
});

describe('opcionesDeFiltro', () => {
  it('no repite valores', () => {
    const opciones = opcionesDeFiltro([visita(), visita()], TODOS);
    expect(opciones.especialistas).toEqual(['Ana Torres']);
    expect(opciones.modalidades).toEqual(['EBR']);
    expect(opciones.niveles).toEqual(['Primaria']);
  });

  it('descarta los valores vacíos', () => {
    const opciones = opcionesDeFiltro([visita({ especialista: '', modalidad: undefined })], TODOS);
    expect(opciones.especialistas).toEqual([]);
    expect(opciones.modalidades).toEqual([]);
  });

  it('con una modalidad puesta, sólo ofrece los niveles que existen dentro de ella', () => {
    const lista = [
      visita({ modalidad: 'EBR', nivel: 'Primaria' }),
      visita({ modalidad: 'EBA', nivel: 'Secundaria' }),
    ];
    expect(opcionesDeFiltro(lista, 'EBR').niveles).toEqual(['Primaria']);
  });

  it('sin modalidad puesta ofrece todos los niveles', () => {
    const lista = [
      visita({ modalidad: 'EBR', nivel: 'Primaria' }),
      visita({ modalidad: 'EBA', nivel: 'Secundaria' }),
    ];
    expect(opcionesDeFiltro(lista, TODOS).niveles).toEqual(['Primaria', 'Secundaria']);
  });

  it('la modalidad no acota la lista de especialistas ni la de modalidades', () => {
    const lista = [
      visita({ especialista: 'Ana Torres', modalidad: 'EBR' }),
      visita({ especialista: 'Luis Quispe', modalidad: 'EBA' }),
    ];
    const opciones = opcionesDeFiltro(lista, 'EBR');
    expect(opciones.especialistas).toEqual(['Ana Torres', 'Luis Quispe']);
    expect(opciones.modalidades).toEqual(['EBR', 'EBA']);
  });

  it('sin visitas no ofrece nada', () => {
    expect(opcionesDeFiltro([], TODOS)).toEqual({
      especialistas: [],
      modalidades: [],
      niveles: [],
    });
  });
});
