import { describe, it, expect } from 'vitest';
import { normDistrito } from './distrito';

describe('normDistrito', () => {
  it('pasa a mayúsculas', () => {
    expect(normDistrito('lampa')).toBe('LAMPA');
  });

  it('elimina tildes (para el match GeoJSON↔BD)', () => {
    expect(normDistrito('Cabanillas')).toBe('CABANILLAS');
    expect(normDistrito('Ñuñoa')).toBe('NUNOA');
    expect(normDistrito('Paratía')).toBe('PARATIA');
  });

  it('recorta espacios al inicio y final', () => {
    expect(normDistrito('  Palca  ')).toBe('PALCA');
  });

  it('deja igual dos variantes que solo difieren en tildes/mayúsculas', () => {
    expect(normDistrito('Vilavila')).toBe(normDistrito('VILAVILA'));
    expect(normDistrito('Paratía')).toBe(normDistrito('PARATIA'));
  });
});
