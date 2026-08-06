import {
  NIVEL_LOGRO_LABELS,
  calcularResultadoBaremo,
  romanoANivel,
  type NivelLogro,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Pruebas de lo que la Fase 3 incorporó al baremo compartido.
 *
 * `baremo-calculator.service.spec.ts` ya cubría los umbrales, el promedio y la
 * conversión a numerales, y sigue pasando sin cambios tras trasladar el cálculo
 * al contrato: es la red que verificó ese movimiento. No se duplica aquí.
 *
 * Lo que sí es nuevo —y es la corrección de H-28— son las piezas que la pantalla
 * de llenado necesitaba y calculaba por su cuenta: el puntaje máximo, el
 * porcentaje y las etiquetas. Al vivir junto al cálculo del nivel, la pantalla y
 * la persistencia dejan de poder discrepar.
 */

describe('Baremo compartido — piezas que consumía la pantalla', () => {
  describe('puntaje máximo y porcentaje', () => {
    it('el máximo es cuatro por desempeño evaluado', () => {
      expect(calcularResultadoBaremo([1, 1, 1]).puntajeMaximo).toBe(12);
    });

    it('el porcentaje se calcula sobre ese máximo', () => {
      expect(calcularResultadoBaremo([1, 1, 1, 1]).porcentaje).toBe(25);
      expect(calcularResultadoBaremo([4, 4]).porcentaje).toBe(100);
    });

    it('una ficha vacía no divide por cero', () => {
      const r = calcularResultadoBaremo([]);

      expect(r.porcentaje).toBe(0);
      expect(Number.isNaN(r.porcentaje)).toBe(false);
    });
  });

  describe('H-28 — la pantalla y la persistencia ya no pueden discrepar', () => {
    // Estos cuatro casos daban resultados distintos según se calcularan con la
    // tabla de la pantalla o con el baremo del servidor. Ahora hay un solo
    // cálculo, de modo que lo que ve el evaluador es lo que queda registrado.
    it.each<[string, number[], NivelLogro]>([
      ['plantilla DIRECTIVO sembrada, 2 desempeños, puntaje 7', [3, 4], 'LOGRO_ESPERADO'],
      ['plantilla DOCENTE sembrada, 3 desempeños, puntaje 5', [1, 2, 2], 'EN_PROCESO'],
      ['plantilla DOCENTE sembrada, 3 desempeños, puntaje 10', [3, 3, 4], 'LOGRO_ESPERADO'],
      ['10 desempeños, puntaje 17', [1, 1, 1, 2, 2, 2, 2, 2, 2, 2], 'EN_PROCESO'],
    ])('%s da %s', (_caso, niveles, esperado) => {
      expect(calcularResultadoBaremo(niveles).nivelLogro).toBe(esperado);
    });

    it('el resultado no depende del orden de los niveles', () => {
      // La pantalla los recorre en el orden de los desempeños de la plantilla y
      // el servidor en el de las respuestas guardadas.
      const a = calcularResultadoBaremo([1, 4, 2, 3]);
      const b = calcularResultadoBaremo([3, 2, 4, 1]);

      expect(a).toEqual(b);
    });
  });

  describe('desempeños sin responder', () => {
    it('un romano vacío da cero, para poder descartarlo antes de calcular', () => {
      // La pantalla filtra los ceros: un desempeño sin responder no debe contar
      // como nivel 1, que lo trataría como la peor calificación posible.
      expect(romanoANivel('')).toBe(0);
    });
  });

  describe('etiquetas legibles', () => {
    it.each<[NivelLogro, string]>([
      ['INICIO', 'Inicio'],
      ['EN_PROCESO', 'En proceso'],
      ['LOGRO_ESPERADO', 'Logro esperado'],
      ['LOGRO_DESTACADO', 'Logro destacado'],
    ])('%s se muestra como %s', (nivel, esperado) => {
      // La pantalla escribía 'LOGRO ESPERADO' con espacio mientras el contrato
      // define 'LOGRO_ESPERADO' con guion bajo. Al separar el código del texto
      // visible, esa divergencia deja de ser posible.
      expect(NIVEL_LOGRO_LABELS[nivel]).toBe(esperado);
    });
  });
});
