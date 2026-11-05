import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Tope del cuerpo JSON de una petición.
 *
 * Express corta en 100 KB por defecto. Sin embargo:
 * - Las fotos de evidencia de una ficha viajan como texto base64 (~100 KB c/u).
 * - Los documentos de sustento PDF de trámites excepcionales viajan como base64
 *   (hasta 10 MB en binario, lo que representa ~13.7 MB codificado en base64).
 *
 * Un límite de 15 MB cubre con holgura los sustentos y fotos sin abrir la puerta
 * a cargas infinitas o abusivas.
 */
export const LIMITE_CUERPO_JSON = '15mb';

export function configurarLimiteDeCuerpo(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: LIMITE_CUERPO_JSON });
}
