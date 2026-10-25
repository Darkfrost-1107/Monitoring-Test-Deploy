import { describe, it, expect } from 'vitest';
import { criterioCompleto, indiceMaximoAccesible, planificacionCompleta } from './avance-ficha';

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

describe('criterioCompleto — pregunta extra Sí/No', () => {
  const conPregunta = (respuesta?: boolean) => ({ texto: '¿Hubo maltrato?', respuesta });

  it('con pregunta sin responder no está completo', () => {
    expect(criterioCompleto('III', 'Justificado', conPregunta(undefined))).toBe(false);
  });

  it('«No» es una respuesta: cuenta como respondida', () => {
    expect(criterioCompleto('III', 'Justificado', conPregunta(false))).toBe(true);
  });

  it('«Sí» también cuenta como respondida', () => {
    expect(criterioCompleto('III', 'Justificado', conPregunta(true))).toBe(true);
  });

  it('sin pregunta en el criterio no se exige respuesta', () => {
    expect(criterioCompleto('III', 'Justificado', { texto: undefined, respuesta: undefined })).toBe(
      true,
    );
    expect(criterioCompleto('III', 'Justificado')).toBe(true);
  });

  it('una pregunta vacía en la plantilla no se exige', () => {
    expect(criterioCompleto('III', 'Justificado', { texto: '', respuesta: undefined })).toBe(true);
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

describe('planificacionCompleta', () => {
  const items = [{ id: 'e1' }, { id: 'e2' }];

  it('exige nivel y observación en cada ítem', () => {
    expect(planificacionCompleta(items, { e1: 3, e2: 4 }, { e1: 'Uno', e2: 'Dos' })).toBe(true);
  });

  it('un ítem sin nivel la deja incompleta', () => {
    expect(planificacionCompleta(items, { e1: 3 }, { e1: 'Uno', e2: 'Dos' })).toBe(false);
  });

  it('un ítem sin observación, o en blanco, la deja incompleta', () => {
    expect(planificacionCompleta(items, { e1: 3, e2: 4 }, { e1: 'Uno' })).toBe(false);
    expect(planificacionCompleta(items, { e1: 3, e2: 4 }, { e1: 'Uno', e2: '  ' })).toBe(false);
  });

  it('sin ítems no hay nada que completar', () => {
    expect(planificacionCompleta([], {}, {})).toBe(true);
  });
});
