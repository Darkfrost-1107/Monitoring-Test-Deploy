import { describe, it, expect } from 'vitest';
import { monitoresDelReporte } from './monitores-del-reporte';

/**
 * Quién realizó los monitoreos que se están analizando: el especialista o el
 * director (o el coordinador o jefe de taller) que levantó cada ficha. Es la lista
 * de opciones del filtro «Monitor».
 */

const ficha = <T extends object = object>(monitorId: string, especialista: string, extra?: T) => ({
  monitorId,
  especialista,
  ...(extra as T),
});

describe('monitoresDelReporte', () => {
  it('lista a cada monitor una sola vez, aunque haya varias fichas suyas', () => {
    const r = monitoresDelReporte([
      ficha('m1', 'Pedro Mamani'),
      ficha('m1', 'Pedro Mamani'),
      ficha('m2', 'Ana Torres'),
    ]);

    expect(r).toHaveLength(2);
  });

  it('los ordena por nombre', () => {
    const r = monitoresDelReporte([ficha('m1', 'Pedro Mamani'), ficha('m2', 'Ana Torres')]);

    expect(r.map((m) => m.nombre)).toEqual(['Ana Torres', 'Pedro Mamani']);
  });

  it('identifica a cada uno por su id, no por su nombre: dos homónimos son dos monitores', () => {
    const r = monitoresDelReporte([ficha('m1', 'Juan Pérez'), ficha('m2', 'Juan Pérez')]);

    expect(r.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('descarta las fichas sin monitor identificado', () => {
    const r = monitoresDelReporte([ficha('', 'Sin id'), ficha('m1', 'Ana Torres')]);

    expect(r).toEqual([{ id: 'm1', nombre: 'Ana Torres' }]);
  });

  it('sin fichas no hay monitores', () => {
    expect(monitoresDelReporte([])).toEqual([]);
  });

  it('acepta un criterio para acotar qué fichas cuentan', () => {
    const r = monitoresDelReporte(
      [ficha('m1', 'Ana', { nivel: 'Primaria' }), ficha('m2', 'Beto', { nivel: 'Secundaria' })],
      (f) => f.nivel === 'Secundaria',
    );

    expect(r).toEqual([{ id: 'm2', nombre: 'Beto' }]);
  });
});
