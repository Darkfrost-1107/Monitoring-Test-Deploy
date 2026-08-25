import { ErrorDeApi } from '@shared/config/api';
import {
  finalizarFichaCompleta,
  firmarFichaCompleta,
  type PayloadFinalizarFicha,
  type PayloadFirmarFicha,
} from '@features/monitoreos/lib/ficha-envio';
import { listarOperaciones, actualizarOperacion } from './outbox';
import { siguientePendiente, aplicarResultado, type ResultadoEnvio } from './outbox-logica';
import type { OperacionOffline } from './outbox-tipos';

/**
 * Motor de sincronización: drena la cola de envío contra el backend.
 *
 * Cada operación se ejecuta de forma idempotente (el modelo ya impide duplicar),
 * así que reintentar es seguro. El resultado decide qué pasa con la entrada:
 * enviada, reintentar (sin red / 5xx) o error permanente (4xx no recuperable).
 */

/** Traduce el fallo de un envío al resultado que entiende la cola. */
export interface Clasificacion {
  resultado: ResultadoEnvio;
  error?: string;
  /** Fallo de autenticación: se corta el drenado sin penalizar la entrada. */
  auth?: boolean;
}

export function clasificar(e: unknown): Clasificacion {
  if (e instanceof ErrorDeApi) {
    const msg = String(e.message ?? '');
    // Ya surtió efecto en un intento anterior: "la ficha ya esta FINALIZADO" o
    // "ya firmó esta ficha con este rol". Es éxito idempotente, no un error.
    if (e.estado === 400 && /ya (est[aá]|firm[oó])/i.test(msg)) return { resultado: 'ok' };
    // La firma llegó antes de que su finalización subiera: se espera, no se descarta.
    if (e.estado === 400 && /no se encontr/i.test(msg)) return { resultado: 'reintentar', error: msg };
    // 401: el token venció trabajando offline. El interceptor intenta refrescarlo
    // solo; si el refresco también caducó, la sesión se cierra. Nunca se descarta
    // la ficha: la cola vive en IndexedDB y se reintenta tras re-loguear, sin que
    // el fallo de sesión consuma el presupuesto de reintentos de la entrada.
    if (e.estado === 401) return { resultado: 'reintentar', error: 'sesión expirada', auth: true };
    if (e.estado >= 400 && e.estado < 500) return { resultado: 'permanente', error: msg };
    return { resultado: 'reintentar', error: msg }; // 5xx: transitorio
  }
  // Sin respuesta HTTP = error de red: se reintenta al recuperar conexión.
  return { resultado: 'reintentar', error: 'sin conexión' };
}

async function ejecutar(op: OperacionOffline): Promise<Clasificacion> {
  try {
    if (op.tipo === 'finalizar-ficha') {
      await finalizarFichaCompleta(op.payload as PayloadFinalizarFicha);
      return { resultado: 'ok' };
    }
    if (op.tipo === 'firmar-ficha') {
      await firmarFichaCompleta(op.payload as PayloadFirmarFicha);
      return { resultado: 'ok' };
    }
    // Tipo aún no soportado por el motor: no se reintenta en vano.
    return { resultado: 'permanente', error: `operación no soportada: ${op.tipo}` };
  } catch (e) {
    return clasificar(e);
  }
}

// Evita dos drenados en paralelo (p. ej. reconexión + apertura de la app).
let sincronizando = false;

/**
 * Vacía la cola en orden. Se detiene ante el primer fallo transitorio (sin red o
 * 5xx) para no golpear en vano; volverá a intentarlo el próximo disparo.
 * Devuelve cuántas se enviaron con éxito.
 */
export async function sincronizarCola(): Promise<number> {
  if (sincronizando) return 0;
  sincronizando = true;
  let enviadas = 0;
  try {
    let op = siguientePendiente(await listarOperaciones());
    while (op) {
      const { resultado, error, auth } = await ejecutar(op);
      // Un fallo de sesión no es culpa de la ficha: se corta el drenado dejando la
      // entrada intacta (sin sumar intento), para reintentarla tras re-loguear.
      if (auth) break;
      await actualizarOperacion(aplicarResultado(op, resultado, error));
      if (resultado === 'ok') enviadas++;
      if (resultado === 'reintentar') break;
      op = siguientePendiente(await listarOperaciones());
    }
  } finally {
    sincronizando = false;
  }
  return enviadas;
}
