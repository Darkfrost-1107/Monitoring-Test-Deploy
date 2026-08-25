/**
 * Pide al navegador que el almacenamiento sea PERSISTENTE.
 *
 * Por defecto, IndexedDB es "best-effort": bajo presión de espacio el navegador
 * puede desalojarla, y con ella la cola de fichas sin enviar. `storage.persist()`
 * marca el origen como persistente para que no la borre sin intervención del
 * usuario. Es idempotente y sólo se concede una vez; llamarla de más no cuesta.
 */
let solicitado = false;

export async function solicitarPersistencia(): Promise<void> {
  if (solicitado) return;
  solicitado = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Si el navegador no lo soporta, la cola sigue funcionando igual.
  }
}
