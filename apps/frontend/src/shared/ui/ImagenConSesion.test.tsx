import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ImagenConSesion } from './ImagenConSesion';
import * as api from '@shared/config/api';

/**
 * Imágenes guardadas en el servidor.
 *
 * El caso que más importa acá es el que casi se rompe al escribir este
 * componente: las evidencias generales de una ficha NO son archivos. Se guardan
 * como `data:` en la propia columna, y tratarlas como ruta las habría dejado en
 * «no disponible» siendo que se veían perfectamente.
 *
 * Lo demás que se fija: que una ruta guardada se pida por el endpoint con
 * sesión —no como `src` directo, que el navegador resolvía contra el frontend—
 * y que un fallo se diga en vez de dejar un hueco mudo.
 */

const DATA_URI = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const GUARDADA = '/evidencias/evidencias-abc.jpeg';

beforeEach(() => vi.restoreAllMocks());

describe('ImagenConSesion', () => {
  it('muestra una imagen embebida sin pedir nada al servidor', () => {
    const blob = vi.spyOn(api, 'requestBlob');

    render(<ImagenConSesion url={DATA_URI} alt="Evidencia 1" />);

    expect(screen.getByAltText('Evidencia 1')).toHaveAttribute('src', DATA_URI);
    expect(blob).not.toHaveBeenCalled();
  });

  it('pide la ruta guardada por el endpoint con sesion', async () => {
    const blob = vi
      .spyOn(api, 'requestBlob')
      .mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));

    render(<ImagenConSesion url={GUARDADA} alt="Evidencia 2" />);

    await waitFor(() =>
      expect(blob).toHaveBeenCalledWith('/api/archivos/evidencias/evidencias-abc.jpeg'),
    );
  });

  it('dice que la imagen no esta disponible cuando falla la descarga', async () => {
    // Un hueco mudo deja a quien lee sin saber si no se adjuntó nada o si la
    // descarga falló.
    vi.spyOn(api, 'requestBlob').mockRejectedValue(new Error('sin red'));

    render(<ImagenConSesion url={GUARDADA} alt="Evidencia 3" />);

    expect(await screen.findByText(/no disponible/i)).toBeInTheDocument();
  });

  it.each([
    ['nula', null],
    ['de un cajon desconocido', '/secretos/x.jpeg'],
  ])('avisa ante una ruta %s en vez de romperse', (_caso, url) => {
    render(<ImagenConSesion url={url} alt="Evidencia 4" />);

    expect(screen.getByText(/no disponible/i)).toBeInTheDocument();
  });
});
