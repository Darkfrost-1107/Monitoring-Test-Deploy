import { reloadForNewVersion } from './chunk-reload';

/**
 * Configura la auto-actualización transparente de la PWA ante nuevos despliegues.
 *
 * 1. Monitorea `controllerchange`: cuando un nuevo Service Worker toma el control
 *    (tras activarse con `skipWaiting` y `clientsClaim`), recarga la aplicación de
 *    forma segura si ya existía un controlador previo, evitando parpadeos en la
 *    primera visita del usuario.
 * 2. Fuerza la verificación proactiva (`registration.update()`) contra el servidor
 *    al iniciar la aplicación y cada vez que el usuario regresa a ella tras tenerla
 *    en segundo plano o desbloquear el dispositivo (`visibilitychange`).
 */
export function setupPwaAutoUpdate(): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker) return;

  let hadPreviousController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadPreviousController) {
      hadPreviousController = true;
      return;
    }
    reloadForNewVersion();
  });

  navigator.serviceWorker.ready
    .then((registration) => {
      // Chequeo proactivo al montar la app
      registration.update().catch(() => {});

      // Chequeo proactivo al regresar del segundo plano
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    })
    .catch(() => {});
}
