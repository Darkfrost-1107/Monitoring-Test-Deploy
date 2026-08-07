import { describe, it, expect } from 'vitest';
import {
  ESCALA_DE_RUBRICAS,
  puntajeDeDesempeno,
  consolidarFicha,
  type DesempenoConsolidable,
} from './consolidado-ficha';

/**
 * El consolidado que se imprime al pie de la ficha oficial: puntaje total y
 * nivel de logro. Vivía dentro de `FichaPrintable` en una función anónima
 * invocada en el sitio, entre la maquetación de las tablas.
 */

const desempenos = (cantidad: number): DesempenoConsolidable[] =>
  Array.from({ length: cantidad }, (_, i) => ({ id: `d${i + 1}` }));

/** Asigna el mismo nivel a todos los desempeños. */
const todosEn = (cantidad: number, romano: string) =>
  Object.fromEntries(desempenos(cantidad).map((d) => [d.id, romano]));

/**
 * Califica `cantidad` desempeños de modo que el total sea exactamente
 * `puntaje`: todos parten en 1 y se les suma de a uno hasta llegar.
 */
const repartir = (cantidad: number, puntaje: number): Record<string, string> => {
  const puntos = Array.from({ length: cantidad }, () => 1);
  let restante = puntaje - cantidad;

  for (let i = 0; i < cantidad && restante > 0; i++) {
    const suma = Math.min(3, restante);
    puntos[i] += suma;
    restante -= suma;
  }

  return Object.fromEntries(puntos.map((p, i) => [`d${i + 1}`, ESCALA_DE_RUBRICAS[p - 1]]));
};

describe('puntajeDeDesempeno', () => {
  it('convierte el romano a su puntaje', () => {
    expect(puntajeDeDesempeno('I')).toBe(1);
    expect(puntajeDeDesempeno('IV')).toBe(4);
  });

  /**
   * La escala de las rúbricas va de 1 a 4: el 0 no existe. La versión anterior
   * devolvía 0 para lo no calificado y lo sumaba al total como si fuera una
   * calificación real.
   */
  it('devuelve nulo cuando el desempeño no está calificado', () => {
    expect(puntajeDeDesempeno(undefined)).toBeNull();
    expect(puntajeDeDesempeno('')).toBeNull();
    expect(puntajeDeDesempeno('V')).toBeNull();
  });
});

describe('consolidarFicha — ficha completa', () => {
  it('suma los puntajes de los cinco desempeños', () => {
    const resultado = consolidarFicha(desempenos(5), todosEn(5, 'III'));
    expect(resultado.completa).toBe(true);
    expect(resultado.puntaje).toBe(15);
  });

  it.each([
    [5, 'INICIO'],
    [7, 'INICIO'],
    [8, 'EN PROCESO'],
    [12, 'EN PROCESO'],
    [13, 'LOGRO ESPERADO'],
    [17, 'LOGRO ESPERADO'],
    [18, 'LOGRO DESTACADO'],
    [20, 'LOGRO DESTACADO'],
  ])('con cinco desempeños, %i puntos es %s', (puntaje, esperado) => {
    const niveles = repartir(5, puntaje);
    // La prueba no sirve si el reparto no da el puntaje pedido.
    expect(consolidarFicha(desempenos(5), niveles).puntaje).toBe(puntaje);
    expect(consolidarFicha(desempenos(5), niveles).nivel).toBe(esperado);
  });

  it('los extremos coinciden con la escala: mínimo 5, máximo 20', () => {
    expect(consolidarFicha(desempenos(5), todosEn(5, 'I')).puntaje).toBe(5);
    expect(consolidarFicha(desempenos(5), todosEn(5, 'IV')).puntaje).toBe(20);
  });

  it('con otra cantidad de desempeños reparte la escala en cuartos', () => {
    expect(consolidarFicha(desempenos(4), todosEn(4, 'I')).nivel).toBe('INICIO');
    expect(consolidarFicha(desempenos(4), todosEn(4, 'IV')).nivel).toBe('LOGRO DESTACADO');
  });
});

describe('consolidarFicha — ficha incompleta', () => {
  /**
   * Antes lo no calificado sumaba 0. Con cinco desempeños y dos sin calificar,
   * el total caía por debajo del mínimo de la escala y ninguna franja lo
   * alcanzaba: el documento oficial se imprimía con el nivel de logro en
   * blanco, sin decir por qué.
   */
  it('no declara nivel de logro cuando falta calificar', () => {
    const resultado = consolidarFicha(desempenos(5), { d1: 'IV', d2: 'IV', d3: 'IV' });
    expect(resultado.completa).toBe(false);
    expect(resultado.nivel).toBeNull();
  });

  it('informa cuántos desempeños quedan sin calificar', () => {
    const resultado = consolidarFicha(desempenos(5), { d1: 'IV', d2: 'IV', d3: 'IV' });
    expect(resultado.sinCalificar).toBe(2);
  });

  /**
   * El puntaje parcial sí se informa, pero es la suma de lo calificado, no de
   * lo calificado más ceros: un desempeño sin evaluar no es un desempeño malo.
   */
  it('el puntaje parcial sólo suma lo calificado', () => {
    expect(consolidarFicha(desempenos(5), { d1: 'IV', d2: 'IV' }).puntaje).toBe(8);
  });

  it('una ficha sin nada calificado no declara nivel', () => {
    const resultado = consolidarFicha(desempenos(5), {});
    expect(resultado.puntaje).toBe(0);
    expect(resultado.nivel).toBeNull();
    expect(resultado.sinCalificar).toBe(5);
  });

  it('una plantilla sin desempeños no declara nivel', () => {
    const resultado = consolidarFicha([], {});
    expect(resultado.nivel).toBeNull();
    expect(resultado.completa).toBe(false);
  });
});
