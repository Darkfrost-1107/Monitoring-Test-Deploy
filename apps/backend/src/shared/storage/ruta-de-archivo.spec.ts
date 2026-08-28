import * as path from 'node:path';
import { esCajonConocido, rutaDeArchivo } from './ruta-de-archivo.js';
import { esDescargaPublica } from './descarga-publica.js';

/**
 * Pruebas de la resolución de rutas de `uploads/`.
 *
 * El cajón y el nombre llegan desde la URL. Sin comprobarlos, un `..` en el
 * nombre convierte al servidor de archivos en un lector del disco entero, y el
 * `.env` está a dos niveles de distancia.
 */

const RAIZ = '/srv/app/uploads';

describe('rutaDeArchivo', () => {
  it('resuelve un archivo dentro de su cajón', () => {
    expect(rutaDeArchivo(RAIZ, 'evidencias', 'evidencias-abc.jpeg')).toBe(
      path.join(RAIZ, 'evidencias', 'evidencias-abc.jpeg'),
    );
  });

  it.each(['evidencias', 'planes', 'reprogramaciones'])('conoce el cajón %s', (cajon) => {
    expect(rutaDeArchivo(RAIZ, cajon, 'x.pdf')).not.toBeNull();
  });

  it.each([
    ['un cajón inventado', 'secretos', 'x.pdf'],
    ['la raíz de uploads', '', 'x.pdf'],
    ['un cajón con salto de directorio', '..', 'x.pdf'],
  ])('rechaza %s', (_caso, cajon, nombre) => {
    expect(rutaDeArchivo(RAIZ, cajon, nombre)).toBeNull();
  });

  it.each([
    ['un salto simple', '../.env'],
    ['un salto doble', '../../etc/passwd'],
    ['una ruta absoluta', '/etc/passwd'],
    ['un separador en el medio', 'sub/dir/x.pdf'],
    ['el nombre vacío', ''],
  ])('rechaza el nombre con %s', (_caso, nombre) => {
    // El `.env` del backend vive dos niveles arriba de `uploads/`.
    expect(rutaDeArchivo(RAIZ, 'evidencias', nombre)).toBeNull();
  });

  it('nunca devuelve una ruta fuera de la raíz', () => {
    const intentos = ['..', '../..', '....//', '%2e%2e', 'a/../../b'];
    for (const nombre of intentos) {
      const resuelta = rutaDeArchivo(RAIZ, 'planes', nombre);
      if (resuelta !== null) {
        expect(resuelta.startsWith(path.join(RAIZ, 'planes') + path.sep)).toBe(true);
      }
    }
  });
});

describe('esCajonConocido', () => {
  it('acepta sólo los tres declarados', () => {
    expect(esCajonConocido('evidencias')).toBe(true);
    expect(esCajonConocido('firmas')).toBe(false);
  });
});

describe('esDescargaPublica', () => {
  /**
   * La lista está vacía a propósito: todo lo que vive en `uploads/` pertenece a
   * una persona o a una institución. Que esta prueba falle significa que
   * alguien publicó algo, y esa decisión merece leerse dos veces.
   */
  it.each([
    'firma-abc.png',
    'solicitud-plantilla-abc.pdf',
    'evidencias/evidencias-abc.jpeg',
    'planes/planes-abc.pdf',
    'reprogramaciones/reprogramaciones-abc.pdf',
    'cualquier-cosa.txt',
  ])('no publica %s', (ruta) => {
    expect(esDescargaPublica(ruta)).toBe(false);
  });
});
