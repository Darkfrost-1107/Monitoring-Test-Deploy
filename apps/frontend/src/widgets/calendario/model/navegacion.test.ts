import { describe, it, expect } from 'vitest';
import {
  VISTAS_CALENDARIO,
  desplazarPeriodo,
  etiquetaDePeriodo,
  sincronizaDiaSeleccionado,
} from './navegacion';

/**
 * Pruebas de la navegación entre períodos del calendario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `getLabelForHeader`, `handlePrev` y
 * `handleNext` vivían dentro de `CalendarioGrid`, un componente de 1.011
 * líneas. Los dos manejadores compartían cuerpo salvo el signo, y ninguno
 * tenía cobertura pese a ser aritmética de fechas, que es donde se esconden los
 * cruces de mes y de año.
 *
 * Se fija el comportamiento de hoy, con sus dos defectos marcados.
 */

const marzo9 = () => new Date(2026, 2, 9);

describe('VISTAS_CALENDARIO', () => {
  it('declara las cinco vistas', () => {
    expect([...VISTAS_CALENDARIO].sort()).toEqual([
      'ANUAL',
      'DIARIO',
      'LISTA',
      'MENSUAL',
      'SEMANAL',
    ]);
  });
});

describe('etiquetaDePeriodo', () => {
  it('en vista mensual nombra el mes y el año', () => {
    expect(etiquetaDePeriodo(marzo9(), 'MENSUAL')).toBe('Marzo 2026');
  });

  it('en vista anual muestra lo mismo que la mensual', () => {
    expect(etiquetaDePeriodo(marzo9(), 'ANUAL')).toBe('Marzo 2026');
  });

  it('en vista diaria antepone el día', () => {
    expect(etiquetaDePeriodo(marzo9(), 'DIARIO')).toBe('9 de Marzo 2026');
  });

  it('en vista de lista cae a la etiqueta mensual', () => {
    expect(etiquetaDePeriodo(marzo9(), 'LISTA')).toBe('Marzo 2026');
  });

  it('en vista semanal muestra el rango dentro del mismo mes', () => {
    // Domingo 8 a sábado 14 de marzo de 2026.
    expect(etiquetaDePeriodo(new Date(2026, 2, 11), 'SEMANAL')).toBe('8 - 14 de Marzo 2026');
  });

  it('en vista semanal nombra los dos meses cuando la semana los cruza', () => {
    // Domingo 29 de marzo a sábado 4 de abril de 2026.
    expect(etiquetaDePeriodo(new Date(2026, 2, 31), 'SEMANAL')).toBe(
      '29 de Marzo - 4 de Abril 2026',
    );
  });

  /**
   * DEFECTO CONOCIDO, fijado a propósito.
   *
   * El año que se imprime es siempre el de la fecha de referencia, no el del
   * final del rango. Una semana que cruza el 31 de diciembre se rotula con el
   * año viejo en los dos extremos.
   */
  it('DEFECTO: una semana que cruza el año se rotula con el año de inicio', () => {
    // Domingo 27 de diciembre de 2026 a sábado 2 de enero de 2027.
    expect(etiquetaDePeriodo(new Date(2026, 11, 30), 'SEMANAL')).toBe(
      '27 de Diciembre - 2 de Enero 2026',
    );
  });
});

describe('desplazarPeriodo', () => {
  it('avanza y retrocede un mes en vista mensual', () => {
    expect(desplazarPeriodo(marzo9(), 'MENSUAL', 1).getMonth()).toBe(3);
    expect(desplazarPeriodo(marzo9(), 'MENSUAL', -1).getMonth()).toBe(1);
  });

  it('avanza un mes en vista anual, igual que la mensual', () => {
    expect(desplazarPeriodo(marzo9(), 'ANUAL', 1).getMonth()).toBe(3);
  });

  it('avanza y retrocede siete días en vista semanal', () => {
    expect(desplazarPeriodo(marzo9(), 'SEMANAL', 1).getDate()).toBe(16);
    expect(desplazarPeriodo(marzo9(), 'SEMANAL', -1).getDate()).toBe(2);
  });

  it('avanza y retrocede un día en vista diaria', () => {
    expect(desplazarPeriodo(marzo9(), 'DIARIO', 1).getDate()).toBe(10);
    expect(desplazarPeriodo(marzo9(), 'DIARIO', -1).getDate()).toBe(8);
  });

  it('no se mueve en vista de lista', () => {
    const resultado = desplazarPeriodo(marzo9(), 'LISTA', 1);
    expect(resultado.getTime()).toBe(marzo9().getTime());
  });

  it('cruza el año hacia adelante y hacia atrás', () => {
    const diciembre = new Date(2026, 11, 15);
    expect(desplazarPeriodo(diciembre, 'MENSUAL', 1).getFullYear()).toBe(2027);

    const enero = new Date(2026, 0, 15);
    expect(desplazarPeriodo(enero, 'MENSUAL', -1).getFullYear()).toBe(2025);
  });

  it('no muta la fecha recibida', () => {
    const original = marzo9();
    desplazarPeriodo(original, 'DIARIO', 1);
    expect(original.getDate()).toBe(9);
  });

  /**
   * DEFECTO CONOCIDO, fijado a propósito.
   *
   * `setMonth` conserva el día del mes, de modo que saltar desde un día 31 a un
   * mes más corto se desborda al mes siguiente: del 31 de marzo hacia atrás se
   * llega al 3 de marzo, no a febrero.
   */
  it('DEFECTO: saltar de mes desde un día 31 se desborda', () => {
    const resultado = desplazarPeriodo(new Date(2026, 2, 31), 'MENSUAL', -1);
    expect(resultado.getMonth()).toBe(2);
    expect(resultado.getDate()).toBe(3);
  });
});

describe('sincronizaDiaSeleccionado', () => {
  it('sólo la vista diaria arrastra el día seleccionado al navegar', () => {
    expect(sincronizaDiaSeleccionado('DIARIO')).toBe(true);
  });

  it.each(['MENSUAL', 'SEMANAL', 'ANUAL', 'LISTA'] as const)('%s no lo arrastra', (vista) => {
    expect(sincronizaDiaSeleccionado(vista)).toBe(false);
  });
});
