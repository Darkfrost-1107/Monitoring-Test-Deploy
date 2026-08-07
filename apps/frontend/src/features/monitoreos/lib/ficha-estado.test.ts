import { describe, it, expect } from 'vitest';
import {
  CLAVE_EVIDENCIA_GENERAL,
  NIVELES_ROMANOS,
  aNivelNumerico,
  aNivelRomano,
  extraerEvidenciasGenerales,
  fichaAEstadoFormulario,
  interpretarEvidenciaGeneral,
  type FichaPersistida,
} from './ficha-estado';

/**
 * Pruebas de la traducción entre la ficha del backend y el estado del
 * formulario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Esta conversión estaba escrita dos veces
 * dentro de `CalendarioSidebar` —una en cada manejador de guardado— y una
 * tercera dentro del `onClick` de un botón. Tres copias de la misma regla, sin
 * cobertura, sobre el dato que decide la calificación que ve el evaluador.
 */

describe('aNivelNumerico', () => {
  it.each([
    ['I', 1],
    ['II', 2],
    ['III', 3],
    ['IV', 4],
  ])('traduce %s a %i', (romano, esperado) => {
    expect(aNivelNumerico(romano)).toBe(esperado);
  });

  /**
   * COMPORTAMIENTO FIJADO. Un romano desconocido no falla: cae a 1, el nivel
   * más bajo. Silencioso, y sobre el dato que define la calificación.
   */
  it('DEFECTO: un valor desconocido cae al nivel más bajo sin avisar', () => {
    expect(aNivelNumerico('X')).toBe(1);
    expect(aNivelNumerico('')).toBe(1);
  });
});

describe('aNivelRomano', () => {
  it.each([
    [1, 'I'],
    [2, 'II'],
    [3, 'III'],
    [4, 'IV'],
  ])('traduce %i a %s', (nivel, esperado) => {
    expect(aNivelRomano(nivel)).toBe(esperado);
  });

  it('cae a I cuando el nivel está fuera de rango', () => {
    expect(aNivelRomano(0)).toBe('I');
    expect(aNivelRomano(9)).toBe('I');
  });

  it('es inverso de aNivelNumerico en todo el rango válido', () => {
    for (const romano of NIVELES_ROMANOS) {
      expect(aNivelRomano(aNivelNumerico(romano))).toBe(romano);
    }
  });
});

describe('extraerEvidenciasGenerales', () => {
  it('recoge sólo las claves de evidencia general', () => {
    const evidencias = extraerEvidenciasGenerales({
      GENERAL_1: 'a.png',
      GENERAL_2: 'b.png',
      'eje-item-3': 'c.png',
    });

    expect(evidencias).toEqual({ GENERAL_1: 'a.png', GENERAL_2: 'b.png' });
  });

  it('incluye la clave legada sin sufijo', () => {
    expect(extraerEvidenciasGenerales({ GENERAL: 'legada.png' })).toEqual({ GENERAL: 'legada.png' });
  });

  it('devuelve un objeto vacío cuando no hay evidencia general', () => {
    expect(extraerEvidenciasGenerales({ 'eje-item-1': 'x.png' })).toEqual({});
  });

  it('tolera la ausencia de evidencias', () => {
    expect(extraerEvidenciasGenerales(undefined)).toEqual({});
  });
});

describe('interpretarEvidenciaGeneral', () => {
  it('lee el formato JSON con slots', () => {
    const crudo = JSON.stringify({ GENERAL_1: 'a.png', GENERAL_3: 'c.png' });
    expect(interpretarEvidenciaGeneral(crudo)).toEqual({ GENERAL_1: 'a.png', GENERAL_3: 'c.png' });
  });

  it('ignora espacios alrededor del JSON', () => {
    expect(interpretarEvidenciaGeneral('  {"GENERAL_1":"a.png"}  ')).toEqual({ GENERAL_1: 'a.png' });
  });

  it('trata una URL suelta como la clave legada', () => {
    expect(interpretarEvidenciaGeneral('https://cdn/evidencia.png')).toEqual({
      [CLAVE_EVIDENCIA_GENERAL]: 'https://cdn/evidencia.png',
    });
  });

  it('cae a la clave legada si el JSON está corrupto', () => {
    expect(interpretarEvidenciaGeneral('{roto')).toEqual({ [CLAVE_EVIDENCIA_GENERAL]: '{roto' });
  });

  it('devuelve vacío cuando no hay evidencia', () => {
    expect(interpretarEvidenciaGeneral(undefined)).toEqual({});
    expect(interpretarEvidenciaGeneral('')).toEqual({});
  });
});

describe('fichaAEstadoFormulario', () => {
  const ficha = (over: Partial<FichaPersistida> = {}): FichaPersistida => ({
    respuestasAspecto: [],
    respuestasDesempeno: [],
    respuestasEjeItem: [],
    ...over,
  });

  it('reconstruye los aspectos marcados', () => {
    const estado = fichaAEstadoFormulario(
      ficha({
        respuestasAspecto: [
          { aspectoId: 'a1', marcado: true },
          { aspectoId: 'a2', marcado: false },
        ],
      }),
    );

    expect(estado.checkedAspects).toEqual({ a1: true, a2: false });
  });

  it('traduce los niveles de desempeño a la escala romana', () => {
    const estado = fichaAEstadoFormulario(
      ficha({
        respuestasDesempeno: [
          { desempenoId: 'd1', nivel: 3 },
          { desempenoId: 'd2', nivel: 1, observaciones: 'Requiere acompañamiento' },
        ],
      }),
    );

    expect(estado.selectedLevels).toEqual({ d1: 'III', d2: 'I' });
    expect(estado.rubricComments).toEqual({ d2: 'Requiere acompañamiento' });
  });

  it('omite las observaciones vacías en lugar de guardar cadenas vacías', () => {
    const estado = fichaAEstadoFormulario(
      ficha({ respuestasDesempeno: [{ desempenoId: 'd1', nivel: 2, observaciones: '' }] }),
    );

    expect(estado.rubricComments).toEqual({});
  });

  it('reconstruye las respuestas de eje con su evidencia y observación', () => {
    const estado = fichaAEstadoFormulario(
      ficha({
        respuestasEjeItem: [
          { ejeItemId: 'e1', nivel: 4, evidenciaUrl: 'e1.png', observacion: 'ok' },
          { ejeItemId: 'e2', nivel: 2 },
        ],
      }),
    );

    expect(estado.respuestasEjeItem).toEqual({ e1: 4, e2: 2 });
    expect(estado.evidenciaUrls).toEqual({ e1: 'e1.png' });
    expect(estado.observacionesEjeItem).toEqual({ e1: 'ok' });
  });

  it('fusiona la evidencia general con la de los ejes', () => {
    const estado = fichaAEstadoFormulario(
      ficha({
        respuestasEjeItem: [{ ejeItemId: 'e1', nivel: 1, evidenciaUrl: 'e1.png' }],
        evidenciaGeneral: JSON.stringify({ GENERAL_1: 'g1.png' }),
      }),
    );

    expect(estado.evidenciaUrls).toEqual({ e1: 'e1.png', GENERAL_1: 'g1.png' });
  });

  it('normaliza a cadena vacía los textos ausentes', () => {
    const estado = fichaAEstadoFormulario(ficha());

    expect(estado.generalComments).toBe('');
    expect(estado.sugerencias).toBe('');
    expect(estado.compromisos).toBe('');
  });

  it('tolera una ficha sin respuestas de eje', () => {
    const estado = fichaAEstadoFormulario(ficha({ respuestasEjeItem: undefined }));

    expect(estado.respuestasEjeItem).toEqual({});
  });
});
