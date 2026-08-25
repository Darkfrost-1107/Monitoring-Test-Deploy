import { describe, it, expect } from 'vitest';
import { ErrorDeApi } from '@shared/config/api';
import { clasificar } from './sync';

const err = (estado: number, msg = '') => new ErrorDeApi(msg, estado, null);

describe('clasificar (resultado de un envío de la cola)', () => {
  it('un 401 (sesión expirada) se reintenta y no penaliza (auth)', () => {
    const c = clasificar(err(401, 'No autorizado'));
    expect(c).toMatchObject({ resultado: 'reintentar', auth: true });
  });

  it('"la ficha ya está FINALIZADO" es éxito idempotente', () => {
    expect(clasificar(err(400, 'La ficha ya esta FINALIZADO.')).resultado).toBe('ok');
  });

  it('un 4xx normal es permanente', () => {
    expect(clasificar(err(400, 'Datos inválidos')).resultado).toBe('permanente');
    expect(clasificar(err(403, 'Prohibido')).resultado).toBe('permanente');
  });

  it('un 5xx se reintenta', () => {
    expect(clasificar(err(503, 'Service Unavailable')).resultado).toBe('reintentar');
  });

  it('un error de red (sin ErrorDeApi) se reintenta', () => {
    expect(clasificar(new TypeError('Failed to fetch')).resultado).toBe('reintentar');
  });
});
