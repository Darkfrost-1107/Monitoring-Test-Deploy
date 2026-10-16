import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Tope del cuerpo JSON de una petición.
 *
 * Express corta en 100 KB por defecto, pero las fotos de evidencia de una ficha
 * viajan como texto base64 dentro del JSON de «finalizar»: comprimidas a 1024 px
 * pesan unos 100 KB cada una, y son hasta tres. 2 MB deja holgura sobre ese peor
 * caso sin abrir la puerta a cuerpos desmesurados.
 *
 * Es un paliativo. Lo correcto es subir cada foto como archivo y guardar solo su
 * ruta, que evita el 33 % extra del base64 y no carga la imagen como texto.
 */
export const LIMITE_CUERPO_JSON = '2mb';

export function configurarLimiteDeCuerpo(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: LIMITE_CUERPO_JSON });
}
