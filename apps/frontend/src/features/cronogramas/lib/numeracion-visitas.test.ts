import { describe, it, expect } from 'vitest';
import {
  MINIMO_DE_VISITAS,
  numerosDeVisitaDisponibles,
  visitasDelEvaluado,
} from './numeracion-visitas';

/**
 * Pruebas de la numeración de visitas de un evaluado.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivía como un `useMemo` de cuarenta líneas
 * dentro de `CronogramaPage`. Decide qué número puede llevar la visita que se
 * está programando, y su regla no es obvia: los números se asignan en orden y
 * no se saltean, salvo para rellenar el hueco de una visita anulada.
 */

const visita = (nroVisita: string, estado = 'PROGRAMADO') => ({ nroVisita, estado });

describe('numerosDeVisitaDisponibles — evaluado sin visitas previas', () => {
  it('ofrece el mínimo de números', () => {
    expect(numerosDeVisitaDisponibles([])).toHaveLength(MINIMO_DE_VISITAS);
  });

  it('sólo la primera queda libre: no se puede saltear', () => {
    const [primera, segunda] = numerosDeVisitaDisponibles([]);

    expect(primera.isFuture).toBe(false);
    expect(segunda.isFuture).toBe(true);
  });

  it('numera con dos dígitos', () => {
    expect(numerosDeVisitaDisponibles([])[0].value).toBe('01');
  });
});

describe('numerosDeVisitaDisponibles — con visitas registradas', () => {
  it('marca como ocupadas las ya programadas', () => {
    const numeros = numerosDeVisitaDisponibles([visita('01'), visita('02')]);

    expect(numeros[0].isOcupado).toBe(true);
    expect(numeros[1].isOcupado).toBe(true);
    expect(numeros[2].isOcupado).toBe(false);
  });

  it('deja libre el número siguiente al último ocupado', () => {
    const numeros = numerosDeVisitaDisponibles([visita('01'), visita('02')]);

    expect(numeros[2].isFuture).toBe(false);
    expect(numeros[3].isFuture).toBe(true);
  });

  it('amplía la lista cuando el evaluado supera el mínimo', () => {
    const muchas = Array.from({ length: 6 }, (_, i) => visita(String(i + 1).padStart(2, '0')));
    expect(numerosDeVisitaDisponibles(muchas)).toHaveLength(7);
  });
});

describe('numerosDeVisitaDisponibles — huecos de visitas anuladas', () => {
  /**
   * Una visita anulada libera su número: es la única forma de reutilizar un
   * número ya emitido, y por eso se distingue de un número nunca usado.
   */
  it('marca el número de una anulada como disponible para rellenar', () => {
    const numeros = numerosDeVisitaDisponibles([visita('01', 'ANULADO'), visita('02')]);

    expect(numeros[0].isAnulado).toBe(true);
    expect(numeros[0].isOcupado).toBe(false);
    expect(numeros[0].isFuture).toBe(false);
  });

  it('una anulada no cuenta para el tope de la numeración', () => {
    const soloAnuladas = numerosDeVisitaDisponibles([visita('04', 'ANULADO')]);

    // El tope sigue siendo el mínimo: no hay visitas vigentes que lo empujen.
    expect(soloAnuladas).toHaveLength(MINIMO_DE_VISITAS);
    expect(soloAnuladas[1].isFuture).toBe(true);
  });

  it('un número anulado no queda marcado como ocupado', () => {
    const numeros = numerosDeVisitaDisponibles([visita('03', 'ANULADO')]);

    expect(numeros[2].isOcupado).toBe(false);
    expect(numeros[2].isAnulado).toBe(true);
  });
});

describe('visitasDelEvaluado — la numeración es de la persona, no del tipo de ficha', () => {
  const v = (evaluadoId: string, tipo: string, nroVisita: string) => ({
    evaluadoId,
    tipo,
    nroVisita,
    estado: 'COMPLETADO',
  });

  it('incluye las visitas de ambos tipos del mismo evaluado', () => {
    const todas = [
      v('ana', 'DIRECTIVO', '01'),
      v('ana', 'DIRECTIVO', '02'),
      v('ana', 'DOCENTE', '03'),
    ];

    expect(visitasDelEvaluado(todas, 'ana')).toHaveLength(3);
  });

  it('deja afuera a los demás evaluados', () => {
    const todas = [v('ana', 'DOCENTE', '01'), v('luis', 'DOCENTE', '01')];

    expect(visitasDelEvaluado(todas, 'ana')).toEqual([todas[0]]);
  });

  it('si fue director dos veces y pasa a docente, la siguiente es la 03', () => {
    const todas = [v('ana', 'DIRECTIVO', '01'), v('ana', 'DIRECTIVO', '02')];

    const siguiente = numerosDeVisitaDisponibles(visitasDelEvaluado(todas, 'ana')).find(
      (n) => !n.isOcupado && !n.isFuture,
    );

    expect(siguiente?.value).toBe('03');
  });
});
