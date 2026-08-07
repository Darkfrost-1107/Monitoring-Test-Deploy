import { describe, it, expect } from 'vitest';
import { numerosDePagina, paginar } from './paginacion';

/**
 * Pruebas de la paginación en el navegador.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba escrita a mano dentro de
 * `PlanMonitoreoAnualPage`, repartida en tres `useMemo`.
 */

const lista = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('paginar — recorte', () => {
  it('devuelve los elementos de la página pedida', () => {
    expect(paginar(lista(14), 2, 6).elementos).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it('la última página puede venir incompleta', () => {
    expect(paginar(lista(14), 3, 6).elementos).toEqual([13, 14]);
  });

  it('calcula el total de páginas', () => {
    expect(paginar(lista(14), 1, 6).totalPaginas).toBe(3);
    expect(paginar(lista(12), 1, 6).totalPaginas).toBe(2);
  });

  it('con la lista vacía hay una página y ningún elemento', () => {
    const pagina = paginar([], 1, 6);

    expect(pagina.elementos).toEqual([]);
    expect(pagina.totalPaginas).toBe(1);
    expect(pagina.paginaActual).toBe(1);
  });
});

describe('paginar — página fuera de rango', () => {
  /**
   * Éste es el defecto que corrige. Al eliminar el último elemento de la última
   * página, la página actual quedaba apuntando a una que ya no existe y el
   * listado aparecía vacío. Ahora se acota a la última disponible.
   */
  it('acota una página que se pasa del total', () => {
    const pagina = paginar(lista(6), 3, 6);

    expect(pagina.paginaActual).toBe(1);
    expect(pagina.elementos).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('acota una página menor que uno', () => {
    expect(paginar(lista(6), 0, 6).paginaActual).toBe(1);
    expect(paginar(lista(6), -3, 6).paginaActual).toBe(1);
  });
});

describe('paginar — texto del rango', () => {
  it('describe el tramo mostrado', () => {
    expect(paginar(lista(14), 1, 6).rango).toBe('Mostrando 1 a 6 de 14 registros');
    expect(paginar(lista(14), 3, 6).rango).toBe('Mostrando 13 a 14 de 14 registros');
  });

  it('sin registros lo dice', () => {
    expect(paginar([], 1, 6).rango).toBe('Mostrando 0 registros');
  });

  /**
   * Antes el final del rango se calculaba con `currentPage * itemsPerPage` sin
   * mirar cuántos elementos había realmente en la página, de modo que una
   * página fuera de rango informaba «Mostrando 7 a 6 de 6 registros».
   */
  it('no informa un tramo que no existe', () => {
    expect(paginar(lista(6), 2, 6).rango).toBe('Mostrando 1 a 6 de 6 registros');
  });
});

describe('numerosDePagina', () => {
  it('con pocas páginas las lista todas', () => {
    expect(numerosDePagina(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  /** Antes se dibujaba un botón por página, sin límite. */
  it('con muchas páginas intercala elisiones', () => {
    expect(numerosDePagina(10, 20)).toEqual([1, 'elision', 9, 10, 11, 'elision', 20]);
  });

  it('cerca del principio no elide por la izquierda', () => {
    expect(numerosDePagina(2, 20)).toEqual([1, 2, 3, 'elision', 20]);
  });

  it('cerca del final no elide por la derecha', () => {
    expect(numerosDePagina(19, 20)).toEqual([1, 'elision', 18, 19, 20]);
  });

  it('siempre incluye la primera y la última', () => {
    const paginas = numerosDePagina(10, 30);

    expect(paginas[0]).toBe(1);
    expect(paginas[paginas.length - 1]).toBe(30);
  });
});
