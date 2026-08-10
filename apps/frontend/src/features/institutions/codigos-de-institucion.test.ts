import { describe, it, expect } from 'vitest';
import {
  LARGO_CODIGO_LOCAL,
  LARGO_CODIGO_MODULAR,
  esCodigoValido,
  errorDeCodigo,
  recortarCodigo,
  ejemploDeCodigo,
} from './codigos-de-institucion';

/**
 * El defecto que motivó este módulo: el campo recortaba a seis dígitos y la
 * validación exigía ocho. Ningún valor podía satisfacer las dos reglas, así que
 * el formulario quedaba trabado con «Deben ser 8 dígitos» sin manera de
 * corregirlo.
 */
describe('código de local — lo que se puede escribir es lo que se acepta', () => {
  it('un código recortado por el campo pasa la validación', () => {
    const escrito = recortarCodigo('123456789', LARGO_CODIGO_LOCAL);

    expect(esCodigoValido(escrito, LARGO_CODIGO_LOCAL)).toBe(true);
    expect(errorDeCodigo(escrito, LARGO_CODIGO_LOCAL)).toBe('');
  });

  it('el ejemplo que se le muestra al usuario tiene el largo que se le exige', () => {
    const digitos = ejemploDeCodigo(LARGO_CODIGO_LOCAL).replace(/\D/g, '');

    expect(digitos).toHaveLength(LARGO_CODIGO_LOCAL);
  });

  it('el mensaje de error nombra el largo que realmente se exige', () => {
    expect(errorDeCodigo('123', LARGO_CODIGO_LOCAL)).toBe(
      `Deben ser ${LARGO_CODIGO_LOCAL} dígitos`,
    );
  });
});

describe('código modular', () => {
  it('lo recortado también le sirve', () => {
    const escrito = recortarCodigo('12345678', LARGO_CODIGO_MODULAR);

    expect(errorDeCodigo(escrito, LARGO_CODIGO_MODULAR)).toBe('');
  });
});

describe('reglas comunes', () => {
  it('un campo vacío pide que se complete, no que se cuente', () => {
    expect(errorDeCodigo('', LARGO_CODIGO_LOCAL)).toBe('Obligatorio');
  });

  it('quedarse corto es un error', () => {
    expect(esCodigoValido('12345', LARGO_CODIGO_LOCAL)).toBe(false);
  });

  it('las letras no cuentan como dígitos', () => {
    expect(recortarCodigo('12a34b56', LARGO_CODIGO_LOCAL)).toBe('123456');
    expect(esCodigoValido('12a456', LARGO_CODIGO_LOCAL)).toBe(false);
  });
});
