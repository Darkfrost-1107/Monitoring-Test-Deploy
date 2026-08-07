import { describe, it, expect } from 'vitest';
import {
  LARGO_CELULAR,
  LARGO_DNI,
  cargaHoraria,
  celularObligatorio,
  celularOpcional,
  correoObligatorio,
  correoOpcional,
  dni,
  escalaMagisterial,
  nombreDePersona,
} from './campos-persona.js';

/**
 * Pruebas de las primitivas de validación de personas.
 *
 * Fase 6 de PLAN_REMEDIACION.md, tarea 4. Estas reglas estaban repetidas en los
 * tres esquemas de alta de personal, con diferencias que no eran visibles sin
 * abrir los tres archivos a la vez.
 *
 * Lo que se fija acá es el comportamiento existente de cada variante: ninguna
 * regla cambió al consolidarlas.
 */

const acepta = (esquema: { safeParse: (v: unknown) => { success: boolean } }, valor: unknown) =>
  esquema.safeParse(valor).success;

const mensajeDe = (
  esquema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } },
  valor: unknown,
) => esquema.safeParse(valor).error?.issues[0]?.message;

describe('dni', () => {
  it('acepta ocho dígitos', () => {
    expect(acepta(dni(), '12345678')).toBe(true);
  });

  it.each([
    ['con menos dígitos', '1234567'],
    ['con más dígitos', '123456789'],
    ['vacío', ''],
  ])('rechaza un DNI %s', (_caso, valor) => {
    expect(acepta(dni(), valor)).toBe(false);
  });

  it('rechaza letras aunque tenga el largo correcto', () => {
    expect(acepta(dni(), '1234567A')).toBe(false);
  });

  it('nombra el largo esperado en el mensaje', () => {
    expect(mensajeDe(dni(), '123')).toContain(String(LARGO_DNI));
  });
});

describe('nombreDePersona', () => {
  it('acepta un nombre de dos caracteres o más', () => {
    expect(acepta(nombreDePersona('Requerido'), 'Ana')).toBe(true);
  });

  it('rechaza un nombre de un solo carácter', () => {
    expect(acepta(nombreDePersona('Requerido'), 'A')).toBe(false);
  });

  /**
   * El mensaje es parámetro porque los tres formularios lo redactan distinto y
   * cambiar el texto que ve el usuario no es tarea de una consolidación técnica.
   */
  it('usa el mensaje que le pasa quien lo compone', () => {
    expect(mensajeDe(nombreDePersona('El nombre es requerido'), 'A')).toBe(
      'El nombre es requerido',
    );
  });
});

describe('correoObligatorio', () => {
  it('acepta un correo válido', () => {
    expect(acepta(correoObligatorio(), 'ana@ugel.gob.pe')).toBe(true);
  });

  it('rechaza un correo mal formado', () => {
    expect(acepta(correoObligatorio(), 'ana@')).toBe(false);
  });

  it('rechaza la ausencia: es obligatorio', () => {
    expect(acepta(correoObligatorio(), '')).toBe(false);
    expect(acepta(correoObligatorio(), undefined)).toBe(false);
  });
});

describe('correoOpcional', () => {
  it('acepta un correo válido', () => {
    expect(acepta(correoOpcional(), 'ana@ugel.gob.pe')).toBe(true);
  });

  /** Un campo que el usuario dejó en blanco entrega cadena vacía, no ausencia. */
  it('acepta la cadena vacía y la ausencia', () => {
    expect(acepta(correoOpcional(), '')).toBe(true);
    expect(acepta(correoOpcional(), undefined)).toBe(true);
  });

  it('rechaza un correo mal formado aunque sea opcional', () => {
    expect(acepta(correoOpcional(), 'ana@')).toBe(false);
  });
});

describe('celularObligatorio', () => {
  it('acepta nueve dígitos que empiezan con 9', () => {
    expect(acepta(celularObligatorio(), '987654321')).toBe(true);
  });

  it('rechaza un número que no empieza con 9', () => {
    expect(acepta(celularObligatorio(), '187654321')).toBe(false);
  });

  it.each([
    ['corto', '98765432'],
    ['largo', '9876543210'],
    ['vacío', ''],
  ])('rechaza un número %s', (_caso, valor) => {
    expect(acepta(celularObligatorio(), valor)).toBe(false);
  });
});

describe('celularOpcional', () => {
  it('acepta el mismo conjunto de números que el obligatorio', () => {
    expect(acepta(celularOpcional(), '987654321')).toBe(true);
    expect(acepta(celularOpcional(), '187654321')).toBe(false);
    expect(acepta(celularOpcional(), '98765432')).toBe(false);
  });

  it('acepta además la cadena vacía y la ausencia', () => {
    expect(acepta(celularOpcional(), '')).toBe(true);
    expect(acepta(celularOpcional(), undefined)).toBe(true);
  });

  /**
   * Largo y formato se comprueban por separado a propósito: «faltan dígitos» y
   * «no empieza con 9» son errores distintos, y el usuario corrige cosas
   * distintas según cuál sea.
   */
  it('distingue el error de largo del de formato', () => {
    expect(mensajeDe(celularOpcional(), '98765')).toContain(String(LARGO_CELULAR));
    expect(mensajeDe(celularOpcional(), '187654321')).toContain('9');
  });
});

describe('escalaMagisterial', () => {
  it.each(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'])('acepta la escala %s', (valor) => {
    expect(acepta(escalaMagisterial(), valor)).toBe(true);
  });

  it('rechaza una escala fuera de la carrera', () => {
    expect(acepta(escalaMagisterial(), 'IX')).toBe(false);
    expect(acepta(escalaMagisterial(), '1')).toBe(false);
  });
});

describe('cargaHoraria', () => {
  it('acepta un valor dentro de los topes', () => {
    expect(acepta(cargaHoraria(1, 40), 30)).toBe(true);
  });

  it('acepta los extremos', () => {
    expect(acepta(cargaHoraria(1, 40), 1)).toBe(true);
    expect(acepta(cargaHoraria(1, 40), 40)).toBe(true);
  });

  it('rechaza por debajo del mínimo y por encima del máximo', () => {
    expect(acepta(cargaHoraria(1, 40), 0)).toBe(false);
    expect(acepta(cargaHoraria(1, 40), 41)).toBe(false);
  });

  it('rechaza un valor que no es número', () => {
    expect(acepta(cargaHoraria(1, 40), '30')).toBe(false);
  });

  it('concuerda el singular de la unidad en el mensaje del mínimo', () => {
    expect(mensajeDe(cargaHoraria(1, 40), 0)).toBe('Carga horaria mínima es 1 hora');
    expect(mensajeDe(cargaHoraria(10, 60), 5)).toBe('Carga horaria mínima es 10 horas');
  });
});
