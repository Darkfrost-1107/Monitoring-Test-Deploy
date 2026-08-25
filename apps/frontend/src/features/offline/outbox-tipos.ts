/**
 * Cola de envío (outbox) del trabajo hecho sin conexión.
 *
 * Cuando el especialista finaliza o firma una ficha en una IE sin señal, la
 * operación no se pierde: se guarda como una entrada durable en IndexedDB y se
 * envía sola al recuperar internet. La sincronización es idempotente por diseño
 * —el backend ya impide duplicar una ficha por (cronograma, plantilla) y una
 * firma por (ficha, rol)—, así que reintentar una entrada nunca crea duplicados.
 */

/** Qué operación quedó pendiente de enviar. */
export type TipoOperacion = 'finalizar-ficha' | 'firmar-ficha';

export type EstadoOperacion = 'pendiente' | 'enviando' | 'enviada' | 'error';

export interface OperacionOffline {
  /** Identificador propio de la entrada en la cola (UUID del cliente). */
  id: string;
  tipo: TipoOperacion;
  /** El cuerpo que se enviará; su forma depende de `tipo`. */
  payload: unknown;
  estado: EstadoOperacion;
  /** Cuántas veces se intentó enviar sin éxito. */
  intentos: number;
  /** Último error, para mostrarlo si queda trabada. */
  error?: string;
  creadaEn: number;
  actualizadaEn: number;
}

/** Descripción legible de una operación, para la UI de "pendientes de enviar". */
export interface OperacionResumen {
  id: string;
  tipo: TipoOperacion;
  estado: EstadoOperacion;
  intentos: number;
}
