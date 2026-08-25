import { describe, it, expect } from 'vitest';
import {
  nuevaOperacion,
  esEnviable,
  siguientePendiente,
  contarPendientes,
  aplicarResultado,
  MAX_INTENTOS,
} from './outbox-logica';
import type { OperacionOffline } from './outbox-tipos';

const op = (over: Partial<OperacionOffline> = {}): OperacionOffline => ({
  id: 'a',
  tipo: 'finalizar-ficha',
  payload: {},
  estado: 'pendiente',
  intentos: 0,
  creadaEn: 1,
  actualizadaEn: 1,
  ...over,
});

describe('nuevaOperacion', () => {
  it('nace pendiente y sin intentos', () => {
    const n = nuevaOperacion('id-1', 'firmar-ficha', { fichaId: 'f1' });
    expect(n).toMatchObject({ id: 'id-1', tipo: 'firmar-ficha', estado: 'pendiente', intentos: 0 });
  });
});

describe('esEnviable', () => {
  it('lo pendiente es enviable', () => expect(esEnviable(op())).toBe(true));
  it('lo enviado no es enviable', () => expect(esEnviable(op({ estado: 'enviada' }))).toBe(false));
  it('en error se reintenta mientras no supere el máximo', () => {
    expect(esEnviable(op({ estado: 'error', intentos: MAX_INTENTOS - 1 }))).toBe(true);
    expect(esEnviable(op({ estado: 'error', intentos: MAX_INTENTOS }))).toBe(false);
  });
});

describe('siguientePendiente', () => {
  it('respeta el orden de llegada', () => {
    const nueva = op({ id: 'nueva', creadaEn: 100 });
    const vieja = op({ id: 'vieja', creadaEn: 10 });
    expect(siguientePendiente([nueva, vieja])?.id).toBe('vieja');
  });

  it('devuelve null si no hay enviables', () => {
    expect(siguientePendiente([op({ estado: 'enviada' })])).toBeNull();
  });
});

describe('contarPendientes', () => {
  it('cuenta todo lo que no está enviado', () => {
    expect(
      contarPendientes([op({ estado: 'enviada' }), op(), op({ estado: 'error', intentos: 9 })]),
    ).toBe(2);
  });
});

describe('aplicarResultado', () => {
  it('ok marca enviada y limpia el error', () => {
    const r = aplicarResultado(op({ error: 'x' }), 'ok');
    expect(r).toMatchObject({ estado: 'enviada', error: undefined });
  });

  it('reintentar suma un intento y queda pendiente', () => {
    const r = aplicarResultado(op({ intentos: 1 }), 'reintentar', 'sin red');
    expect(r).toMatchObject({ estado: 'pendiente', intentos: 2, error: 'sin red' });
  });

  it('reintentar hasta el máximo termina en error', () => {
    const r = aplicarResultado(op({ intentos: MAX_INTENTOS - 1 }), 'reintentar', 'sin red');
    expect(r).toMatchObject({ estado: 'error', intentos: MAX_INTENTOS });
  });

  it('permanente va directo a error', () => {
    const r = aplicarResultado(op(), 'permanente', 'ficha inválida');
    expect(r).toMatchObject({ estado: 'error', intentos: 1 });
  });
});
