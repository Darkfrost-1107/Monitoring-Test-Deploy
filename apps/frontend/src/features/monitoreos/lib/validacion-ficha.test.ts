import { describe, it, expect } from 'vitest';
import {
  validarCierreDeFicha,
  type PlantillaValidable,
  type RespuestasAValidar,
} from './validacion-ficha';

/**
 * Pruebas de las condiciones para cerrar una ficha de monitoreo.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Las cinco reglas vivían dentro de
 * `handleFinalizeClick`, en un componente de 1.294 líneas, intercaladas con
 * llamadas a `alert`. Deciden si una evaluación puede darse por terminada —es
 * decir, si queda firmada con lo que haya— y no tenían cobertura.
 *
 * El orden importa: se informa la primera regla incumplida, no todas.
 */

const plantilla = (over: Partial<PlantillaValidable> = {}): PlantillaValidable => ({
  desempenos: [{ id: 'd1', nombre: 'Involucra activamente a los estudiantes' }],
  ejesItems: [],
  ...over,
});

const respuestas = (over: Partial<RespuestasAValidar> = {}): RespuestasAValidar => ({
  selectedLevels: { d1: 'III' },
  rubricComments: { d1: 'Se observa dominio del aula.' },
  observacionesEjeItem: {},
  sugerencias: 'Continuar con las jornadas de reflexión.',
  compromisos: 'Seguimiento mensual.',
  ...over,
});

describe('validarCierreDeFicha — ficha completa', () => {
  it('no informa nada cuando todo está cargado', () => {
    expect(validarCierreDeFicha(plantilla(), respuestas())).toBeNull();
  });

  it('acepta una plantilla sin ejes ni ítems', () => {
    expect(validarCierreDeFicha(plantilla({ ejesItems: undefined }), respuestas())).toBeNull();
  });
});

describe('validarCierreDeFicha — niveles de logro', () => {
  it('exige calificar todos los desempeños', () => {
    const mensaje = validarCierreDeFicha(plantilla(), respuestas({ selectedLevels: {} }));
    expect(mensaje).toContain('Faltan calificar niveles');
  });

  it('nombra cada desempeño sin calificar', () => {
    const conDos = plantilla({
      desempenos: [
        { id: 'd1', nombre: 'Primer desempeño' },
        { id: 'd2', nombre: 'Segundo desempeño' },
      ],
    });
    const mensaje = validarCierreDeFicha(conDos, respuestas({ selectedLevels: { d1: 'III' } }));

    expect(mensaje).toContain('Segundo desempeño');
    expect(mensaje).not.toContain('Primer desempeño');
  });

  it('recorta los nombres largos para que la lista siga siendo legible', () => {
    const largo = plantilla({
      desempenos: [{ id: 'd1', nombre: 'A'.repeat(80) }],
    });
    const mensaje = validarCierreDeFicha(largo, respuestas({ selectedLevels: {} }));

    expect(mensaje).toContain(`${'A'.repeat(45)}...`);
    expect(mensaje).not.toContain('A'.repeat(60));
  });
});

describe('validarCierreDeFicha — justificaciones', () => {
  it('exige un comentario por desempeño', () => {
    const mensaje = validarCierreDeFicha(plantilla(), respuestas({ rubricComments: {} }));
    expect(mensaje).toContain('Faltan justificaciones');
  });

  /**
   * Un comentario en blanco no justifica nada. La regla existe para que quede
   * asentado por qué se puso ese nivel, no para llenar un campo.
   */
  it('rechaza un comentario que sólo tiene espacios', () => {
    const mensaje = validarCierreDeFicha(plantilla(), respuestas({ rubricComments: { d1: '   ' } }));
    expect(mensaje).toContain('Faltan justificaciones');
  });
});

describe('validarCierreDeFicha — observaciones de ejes e ítems', () => {
  const conEjes = plantilla({
    ejesItems: [{ id: 'e1', numero: '1', descripcion: 'Uso pedagógico del tiempo' }],
  });

  it('exige observación en cada eje o ítem', () => {
    const mensaje = validarCierreDeFicha(conEjes, respuestas());
    expect(mensaje).toContain('Faltan observaciones');
  });

  it('rechaza una observación en blanco', () => {
    const mensaje = validarCierreDeFicha(conEjes, respuestas({ observacionesEjeItem: { e1: '  ' } }));
    expect(mensaje).toContain('Faltan observaciones');
  });

  it('acepta la ficha con la observación cargada', () => {
    const completo = respuestas({ observacionesEjeItem: { e1: 'Se cumple.' } });
    expect(validarCierreDeFicha(conEjes, completo)).toBeNull();
  });

  it('incluye el número del ítem en el mensaje', () => {
    const mensaje = validarCierreDeFicha(conEjes, respuestas());
    expect(mensaje).toContain('1. Uso pedagógico del tiempo');
  });
});

describe('validarCierreDeFicha — cierre narrativo', () => {
  it('exige sugerencias', () => {
    expect(validarCierreDeFicha(plantilla(), respuestas({ sugerencias: '' }))).toBe(
      'Las sugerencias son obligatorias para finalizar la ficha.',
    );
  });

  it('rechaza sugerencias en blanco', () => {
    expect(validarCierreDeFicha(plantilla(), respuestas({ sugerencias: '   ' }))).toContain(
      'sugerencias son obligatorias',
    );
  });

  it('exige compromisos', () => {
    expect(validarCierreDeFicha(plantilla(), respuestas({ compromisos: '' }))).toBe(
      'Los compromisos son obligatorios para finalizar la ficha.',
    );
  });

  it('rechaza compromisos en blanco', () => {
    expect(validarCierreDeFicha(plantilla(), respuestas({ compromisos: '   ' }))).toContain(
      'compromisos son obligatorios',
    );
  });
});

describe('validarCierreDeFicha — orden de las reglas', () => {
  /**
   * Se informa sólo la primera regla incumplida. Con la ficha vacía, eso es el
   * nivel de logro: sin calificar no tiene sentido pedir la justificación.
   */
  it('informa los niveles antes que cualquier otra falta', () => {
    const vacio = respuestas({
      selectedLevels: {},
      rubricComments: {},
      sugerencias: '',
      compromisos: '',
    });

    expect(validarCierreDeFicha(plantilla(), vacio)).toContain('Faltan calificar niveles');
  });

  it('informa las justificaciones antes que el cierre narrativo', () => {
    const sinComentarios = respuestas({ rubricComments: {}, sugerencias: '', compromisos: '' });
    expect(validarCierreDeFicha(plantilla(), sinComentarios)).toContain('Faltan justificaciones');
  });

  it('informa las sugerencias antes que los compromisos', () => {
    const sinCierre = respuestas({ sugerencias: '', compromisos: '' });
    expect(validarCierreDeFicha(plantilla(), sinCierre)).toContain('sugerencias');
  });
});
