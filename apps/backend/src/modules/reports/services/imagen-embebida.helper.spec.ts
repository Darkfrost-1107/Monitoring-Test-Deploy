import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { resolverImagenEmbebida } from './imagen-embebida.helper.js';

/**
 * Las firmas y las fotos de evidencia llegan al PDF como data URI: Gotenberg no
 * puede pedirle archivos privados al servidor, así que se leen del disco y se
 * incrustan en el HTML.
 */

describe('resolverImagenEmbebida', () => {
  let raiz: string;

  beforeEach(async () => {
    raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-'));
    await fs.mkdir(path.join(raiz, 'uploads'));
  });

  afterEach(async () => {
    await fs.rm(raiz, { recursive: true, force: true });
  });

  it('devuelve tal cual una imagen que ya es data URI', async () => {
    const uri = 'data:image/jpeg;base64,AAAA';

    expect(await resolverImagenEmbebida(uri, raiz)).toBe(uri);
  });

  it('lee un archivo de uploads y lo devuelve como data URI', async () => {
    await fs.writeFile(path.join(raiz, 'uploads', 'firma-1.png'), Buffer.from('PNGDATA'));

    expect(await resolverImagenEmbebida('/uploads/firma-1.png', raiz)).toBe(
      `data:image/png;base64,${Buffer.from('PNGDATA').toString('base64')}`,
    );
  });

  it.each([
    ['foto.jpg', 'image/jpeg'],
    ['foto.jpeg', 'image/jpeg'],
    ['foto.webp', 'image/webp'],
    ['foto.png', 'image/png'],
  ])('deduce el tipo de %s', async (nombre, tipo) => {
    await fs.writeFile(path.join(raiz, 'uploads', nombre), Buffer.from('x'));

    expect(await resolverImagenEmbebida(`/uploads/${nombre}`, raiz)).toMatch(
      new RegExp(`^data:${tipo};base64,`),
    );
  });

  it('un archivo que no existe devuelve null, no falla', async () => {
    expect(await resolverImagenEmbebida('/uploads/no-esta.png', raiz)).toBeNull();
  });

  it('no sale del directorio de subidas aunque la ruta lleve ..', async () => {
    await fs.writeFile(path.join(raiz, 'secreto.png'), Buffer.from('SECRETO'));

    expect(await resolverImagenEmbebida('/uploads/../secreto.png', raiz)).toBeNull();
  });

  it('no sigue URLs externas', async () => {
    expect(await resolverImagenEmbebida('https://ejemplo.com/foto.png', raiz)).toBeNull();
  });

  it('un valor vacío devuelve null', async () => {
    expect(await resolverImagenEmbebida(null, raiz)).toBeNull();
    expect(await resolverImagenEmbebida('', raiz)).toBeNull();
    expect(await resolverImagenEmbebida(undefined, raiz)).toBeNull();
  });
});
