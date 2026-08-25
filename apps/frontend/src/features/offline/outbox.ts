import { get, set, createStore } from 'idb-keyval';
import type { OperacionOffline, TipoOperacion } from './outbox-tipos';
import { nuevaOperacion } from './outbox-logica';

/** El cronograma al que apunta una operación, según su tipo de payload. */
function cronogramaDe(op: OperacionOffline): string | undefined {
  const p = op.payload as { visitId?: string; cronogramaId?: string } | null;
  return p?.visitId ?? p?.cronogramaId;
}

/**
 * Persistencia de la cola de envío en IndexedDB.
 *
 * Capa fina sobre `idb-keyval`: guarda y lee el arreglo de operaciones. Las
 * reglas (qué enviar, cómo reintentar) viven en `outbox-logica.ts`, con pruebas.
 */

// Base PROPIA, separada del caché de queries. `idb-keyval` crea el store sólo al
// nacer la base, así que dos stores no pueden convivir bajo un mismo nombre de
// base: si compartieran nombre, el que abre primero gana y el otro store nunca
// existe (y la cola no persistiría). Por eso la cola vive en su propia base.
const store = createStore('sistema-monitoreo-outbox', 'outbox');
const CLAVE = 'operaciones';

/** Evento que avisa que la cola cambió, para que la UI se refresque. */
export const EVENTO_CAMBIO = 'sm-outbox';
const notificarCambio = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CAMBIO));
};

const idFactory = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Todas las operaciones guardadas, en el orden en que están. */
export async function listarOperaciones(): Promise<OperacionOffline[]> {
  return (await get<OperacionOffline[]>(CLAVE, store)) ?? [];
}

/** Reemplaza el arreglo completo de operaciones. */
export async function guardarOperaciones(ops: readonly OperacionOffline[]): Promise<void> {
  await set(CLAVE, ops, store);
  notificarCambio();
}

/** Agrega una operación nueva al final de la cola y devuelve su id. */
export async function encolar(tipo: TipoOperacion, payload: unknown): Promise<string> {
  const op = nuevaOperacion(idFactory(), tipo, payload);
  const ops = await listarOperaciones();
  await guardarOperaciones([...ops, op]);
  return op.id;
}

/** Sustituye una operación por su versión actualizada (misma id). */
export async function actualizarOperacion(op: OperacionOffline): Promise<void> {
  const ops = await listarOperaciones();
  await guardarOperaciones(ops.map((o) => (o.id === op.id ? op : o)));
}

/** Descarta las operaciones ya enviadas, para no acumularlas. */
export async function limpiarEnviadas(): Promise<void> {
  const ops = await listarOperaciones();
  await guardarOperaciones(ops.filter((o) => o.estado !== 'enviada'));
}

/** Identificadores de cronograma con alguna operación aún sin enviar. */
export async function cronogramasPendientes(): Promise<Set<string>> {
  const ops = await listarOperaciones();
  const ids = ops.filter((o) => o.estado !== 'enviada').map(cronogramaDe).filter(Boolean);
  return new Set(ids as string[]);
}
