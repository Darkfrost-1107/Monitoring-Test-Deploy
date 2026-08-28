import { describe, it, expect } from 'vitest';
import { rutaDeDescarga } from './archivo-guardado';

/**
 * Traducción de la ruta guardada a la ruta que se pide.
 *
 * Lo que se fija acá es que ningún valor de la base termine convertido en una
 * ruta que el navegador resuelva contra el frontend —que es el defecto que
 * dejaba las imágenes rotas y los enlaces abriendo la aplicación— y que un
 * valor con forma rara no se convierta en una petición inventada.
 */

describe('rutaDeDescarga', () => {
  it.each([
    ['una evidencia', '/evidencias/evidencias-abc.jpeg', '/api/archivos/evidencias/evidencias-abc.jpeg'],
    ['un plan', '/planes/planes-abc.pdf', '/api/archivos/planes/planes-abc.pdf'],
    [
      'un sustento de reprogramación',
      '/reprogramaciones/reprogramaciones-abc.pdf',
      '/api/archivos/reprogramaciones/reprogramaciones-abc.pdf',
    ],
  ])('traduce %s', (_caso, guardada, esperada) => {
    expect(rutaDeDescarga(guardada)).toBe(esperada);
  });

  it('admite el prefijo histórico /uploads', () => {
    // Hay filas viejas guardadas con ese prefijo.
    expect(rutaDeDescarga('/uploads/planes/planes-abc.pdf')).toBe(
      '/api/archivos/planes/planes-abc.pdf',
    );
  });

  it('respeta una URL absoluta sin tocarla', () => {
    // Un bucket externo, en un despliegue futuro, ya apunta a donde debe.
    const externa = 'https://bucket.example.com/planes/abc.pdf';
    expect(rutaDeDescarga(externa)).toBe(externa);
  });

  it('escapa el nombre para que no se cuele un segmento extra', () => {
    expect(rutaDeDescarga('/planes/con espacio.pdf')).toBe(
      '/api/archivos/planes/con%20espacio.pdf',
    );
  });

  it.each([
    ['nulo', null],
    ['indefinido', undefined],
    ['vacío', ''],
    ['un cajón desconocido', '/secretos/x.pdf'],
    ['sin cajón', '/x.pdf'],
    ['con subdirectorios', '/planes/sub/x.pdf'],
    ['un salto de directorio', '/planes/../../.env'],
  ])('devuelve null para %s', (_caso, guardada) => {
    // `null` no es un error: hay filas viejas con formatos que ya no se usan, y
    // la pantalla debe poder decir «sin archivo» en vez de romperse.
    expect(rutaDeDescarga(guardada)).toBeNull();
  });
});
