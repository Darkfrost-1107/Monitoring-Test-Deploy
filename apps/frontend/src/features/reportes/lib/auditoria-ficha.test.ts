import { describe, it, expect } from 'vitest';
import {
  desempenosAuditados,
  resumenDeAuditoria,
  type DesempenoAuditable,
} from './auditoria-ficha';

/**
 * Lo que la pantalla de auditoría muestra de cada desempeño.
 *
 * Vivía dentro de `FichaAuditorModal`, entre la maquetación de la lista
 * lateral. Es la pantalla donde alguien verifica qué se registró, así que es el
 * último lugar donde conviene rellenar un hueco con un valor por omisión.
 */

const desempenos = (cantidad: number): DesempenoAuditable[] =>
  Array.from({ length: cantidad }, (_, i) => ({ id: `d${i + 1}`, nombre: `Desempeño ${i + 1}` }));

describe('desempenosAuditados', () => {
  it('numera los desempeños en el orden de la plantilla', () => {
    const auditados = desempenosAuditados(desempenos(3), {});
    expect(auditados.map((d) => d.orden)).toEqual([1, 2, 3]);
  });

  it('devuelve el nivel registrado', () => {
    const auditados = desempenosAuditados(desempenos(2), { d1: 'IV', d2: 'I' });
    expect(auditados.map((d) => d.nivel)).toEqual(['IV', 'I']);
  });

  /**
   * DEFECTO CORREGIDO. La lista mostraba `Nivel {selectedLevel || 'III'}`: un
   * desempeño sin calificar aparecía como Nivel III —logro esperado— en la
   * pantalla que existe para verificar qué se registró. Es el mismo respaldo
   * que se retiró de `ReportesGrid`.
   */
  it('no inventa un nivel cuando el desempeño no fue calificado', () => {
    const [sinCalificar] = desempenosAuditados(desempenos(1), {});
    expect(sinCalificar.nivel).toBeNull();
    expect(sinCalificar.calificado).toBe(false);
  });

  it('tampoco lo inventa ante un nivel vacío', () => {
    const [sinCalificar] = desempenosAuditados(desempenos(1), { d1: '' });
    expect(sinCalificar.nivel).toBeNull();
  });

  it('marca como calificado sólo al que tiene nivel', () => {
    const auditados = desempenosAuditados(desempenos(2), { d1: 'II' });
    expect(auditados.map((d) => d.calificado)).toEqual([true, false]);
  });

  it('sin desempeños devuelve una lista vacía', () => {
    expect(desempenosAuditados([], {})).toEqual([]);
  });
});

describe('resumenDeAuditoria', () => {
  it('cuenta cuántos quedaron sin calificar sobre el total', () => {
    const auditados = desempenosAuditados(desempenos(5), { d1: 'IV', d2: 'III' });
    expect(resumenDeAuditoria(auditados)).toEqual({
      total: 5,
      calificados: 2,
      sinCalificar: 3,
      completa: false,
    });
  });

  it('declara completa la ficha con todos los desempeños calificados', () => {
    const auditados = desempenosAuditados(desempenos(2), { d1: 'I', d2: 'II' });
    expect(resumenDeAuditoria(auditados)).toMatchObject({ sinCalificar: 0, completa: true });
  });

  /**
   * Una plantilla sin desempeños no es una ficha completa: no hay nada que
   * auditar. Declararla completa invitaría a firmarla.
   */
  it('una ficha sin desempeños no se declara completa', () => {
    expect(resumenDeAuditoria([])).toMatchObject({ total: 0, completa: false });
  });
});
