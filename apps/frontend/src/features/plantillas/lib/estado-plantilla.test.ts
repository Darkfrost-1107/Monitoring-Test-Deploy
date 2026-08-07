import { describe, it, expect } from 'vitest';
import { esCambioIrreversible, siguienteEstado } from './estado-plantilla';

/**
 * Pruebas del ciclo de estados de una plantilla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. El cálculo estaba escrito dos veces en la
 * misma pantalla: en el manejador que aplica el cambio y en el texto del modal
 * que lo anuncia. Estas pruebas fijan una sola regla para las dos.
 */

describe('siguienteEstado', () => {
  it('un borrador pasa a vigente', () => {
    expect(siguienteEstado('Borrador')).toBe('Vigente');
  });

  it('una vigente pasa a histórica', () => {
    expect(siguienteEstado('Vigente')).toBe('Historico');
  });

  /**
   * El botón de cambiar estado no se ofrece para una plantilla histórica, así
   * que esta transición no se alcanza desde la interfaz. Se fija de todos modos
   * para que el ciclo quede completo y no devuelva `undefined` si alguna vez se
   * la invoca.
   */
  it('una histórica vuelve a borrador, aunque la interfaz no lo ofrezca', () => {
    expect(siguienteEstado('Historico')).toBe('Borrador');
  });
});

describe('esCambioIrreversible', () => {
  it('avisa al pasar de vigente a histórica', () => {
    expect(esCambioIrreversible('Vigente')).toBe(true);
  });

  it('no avisa al publicar un borrador', () => {
    expect(esCambioIrreversible('Borrador')).toBe(false);
  });
});
