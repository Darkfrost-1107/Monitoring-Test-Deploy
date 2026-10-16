import { describe, it, expect } from 'vitest';
import { criterioCompleto, indiceMaximoAccesible } from './avance-ficha';

describe('criterioCompleto', () => {
  it('exige nivel y justificación, igual que la validación del cierre', () => {
    expect(criterioCompleto('III', 'Se observó participación activa')).toBe(true);
  });

  it('no está completo sin nivel', () => {
    expect(criterioCompleto(undefined, 'Hay observación')).toBe(false);
    expect(criterioCompleto('', 'Hay observación')).toBe(false);
  });

  it('no está completo sin observación', () => {
    expect(criterioCompleto('III', undefined)).toBe(false);
    expect(criterioCompleto('III', '')).toBe(false);
  });

  it('una observación en blanco no cuenta', () => {
    expect(criterioCompleto('III', '   \n ')).toBe(false);
  });
});

describe('indiceMaximoAccesible', () => {
  const claves = ['a', 'b', 'c', 'cierre'];

  it('con el primer paso incompleto sólo se puede estar en ese paso', () => {
    expect(indiceMaximoAccesible(claves, () => false)).toBe(0);
  });

  it('se puede llegar hasta el primer paso incompleto', () => {
    const completos = new Set(['a']);

    expect(indiceMaximoAccesible(claves, (c) => completos.has(c))).toBe(1);
  });

  it('un paso completo después de uno incompleto no lo desbloquea', () => {
    const completos = new Set(['a', 'c']);

    expect(indiceMaximoAccesible(claves, (c) => completos.has(c))).toBe(1);
  });

  it('con todos los criterios completos se llega al cierre', () => {
    const completos = new Set(['a', 'b', 'c']);

    expect(indiceMaximoAccesible(claves, (c) => completos.has(c))).toBe(3);
  });

  it('sin pasos devuelve 0', () => {
    expect(indiceMaximoAccesible([], () => true)).toBe(0);
  });
});
