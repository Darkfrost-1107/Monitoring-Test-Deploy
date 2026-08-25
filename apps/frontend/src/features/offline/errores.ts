import { ErrorDeApi } from '@shared/config/api';

/**
 * Sin conexión, una petición falla sin respuesta HTTP: `fetch` lanza y nunca se
 * construye un `ErrorDeApi`. Distinguirlo es lo que decide encolar (fue la red)
 * en vez de mostrar un error (el backend rechazó de verdad).
 */
export const esErrorDeRed = (error: unknown): boolean => !(error instanceof ErrorDeApi);
