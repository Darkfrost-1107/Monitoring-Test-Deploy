import { get, set, del, createStore } from 'idb-keyval';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persistencia del cache de TanStack Query en IndexedDB.
 *
 * Es la base del trabajo sin conexión (Fase 2): lo que el especialista consultó
 * con señal —sus monitoreos, la plantilla, el padrón— queda guardado y disponible
 * al abrir la app offline. Se usa IndexedDB y no `localStorage` porque el volumen
 * es estructurado y puede superar el tope de ~5 MB de localStorage.
 *
 * El cache se rehidrata al arrancar (ver `PersistQueryClientProvider` en
 * `config.tsx`); combinado con `networkMode: 'offlineFirst'`, las consultas
 * devuelven el dato guardado cuando no hay red en vez de quedar en pausa.
 */

// Base y almacén propios, para no colisionar con otras claves de la app.
const store = createStore('sistema-monitoreo-offline', 'query-cache');

const idbStorage = {
  getItem: (key: string) => get<string>(key, store).then((v) => v ?? null),
  setItem: (key: string, value: string) => set(key, value, store),
  removeItem: (key: string) => del(key, store),
};

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'sm-query-cache',
  // Agrupa escrituras: el cache no se serializa en cada cambio.
  throttleTime: 1000,
});

/** Cuánto tiempo se considera vigente el cache persistido antes de descartarlo. */
export const MAX_AGE_CACHE = 1000 * 60 * 60 * 24 * 7; // 7 días
