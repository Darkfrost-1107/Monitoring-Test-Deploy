import { jest } from '@jest/globals';
import { PdfGeneratorService } from './pdf-generator.service.js';

const PDF_BYTES = Buffer.from('%PDF-1.7 fake');

function okResponse(): Response {
  return new Response(PDF_BYTES, { status: 200 });
}

describe('PdfGeneratorService (Gotenberg)', () => {
  const originalUrl = process.env.GOTENBERG_URL;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.GOTENBERG_URL = 'http://gotenberg.test:3000/';
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.GOTENBERG_URL;
    else process.env.GOTENBERG_URL = originalUrl;
  });

  it('envía el HTML renderizado al endpoint chromium de Gotenberg y devuelve el PDF', async () => {
    const service = new PdfGeneratorService();

    const pdf = await service.generatePdfFromTemplate('ficha-report', {
      ficha: { id: 'abc' },
    });

    expect(pdf.equals(PDF_BYTES)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://gotenberg.test:3000/forms/chromium/convert/html');
    expect(init?.method).toBe('POST');
    const form = init?.body as FormData;
    const index = form.get('files') as File;
    expect(index.name).toBe('index.html');
    expect(await index.text()).toContain('<html');
  });

  it('configura A4, fondos y numeración de páginas en el pie', async () => {
    const service = new PdfGeneratorService();

    await service.generatePdfFromTemplate('ficha-report', {});

    const form = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(form.get('paperWidth')).toBe('8.27');
    expect(form.get('paperHeight')).toBe('11.7');
    expect(form.get('printBackground')).toBe('true');
    const footer = form.getAll('files').find((f) => (f as File).name === 'footer.html') as File;
    const footerHtml = await footer.text();
    expect(footerHtml).toContain('pageNumber');
    expect(footerHtml).toContain('totalPages');
  });

  it('falla con un mensaje claro si Gotenberg responde con error', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 503 }));
    const service = new PdfGeneratorService();

    await expect(service.generatePdfFromTemplate('ficha-report', {})).rejects.toThrow(
      /Gotenberg respondió 503/,
    );
  });

  it('falla con un mensaje claro si Gotenberg no es alcanzable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const service = new PdfGeneratorService();

    await expect(service.generatePdfFromTemplate('ficha-report', {})).rejects.toThrow(
      /No se pudo contactar a Gotenberg/,
    );
  });

  describe('diseño de la ficha', () => {
    async function renderFicha(data: object): Promise<string> {
      const service = new PdfGeneratorService();
      await service.generatePdfFromTemplate('ficha-report', data);
      const form = fetchMock.mock.calls[0][1]?.body as FormData;
      return (form.get('files') as File).text();
    }

    it('marca en la regla de logro solo el nivel alcanzado de cada rúbrica', async () => {
      const html = await renderFicha({
        ficha: { promedio: '3.00' },
        respuestas: [{ nombre: 'A', nivel: 3, observaciones: '—' }],
      });

      expect(html.match(/class="paso nivel-3 activo"/g)).toHaveLength(1);
      expect(html.match(/class="paso nivel-\d activo"/g)).toHaveLength(1);
      expect(html.match(/class="paso nivel-\d"/g)).toHaveLength(3);
    });

    it('ubica el promedio sobre la escala de 4 tramos', async () => {
      const html = await renderFicha({ ficha: { promedio: '2.50', nivelLogro: 'LOGRO_ESPERADO' } });

      expect(html).toMatch(/class="marcador"[^>]*left:\s*50%/);
    });

    it('en un instrumento informativo no dibuja promedio ni escala', async () => {
      const html = await renderFicha({ ficha: { promedio: null, nivelLogro: null } });

      expect(html).not.toContain('class="marcador"');
      expect(html).toContain('Instrumento informativo');
    });

    it('en un instrumento informativo la regla tiene tres valoraciones: No, Parcial y Sí', async () => {
      const html = await renderFicha({
        ficha: { promedio: null, nivelLogro: null },
        respuestas: [{ nombre: 'A', nivel: 2, observaciones: '—' }],
      });

      expect(html).toMatch(/class="paso texto nivel-2 activo"[^>]*>\s*Parcial\s*</);
      expect(html.match(/class="paso texto nivel-\d( activo)?"/g)).toHaveLength(3);
      expect(html).not.toMatch(/>\s*IV\s*</);
    });

    it('incluye el logo de la UGEL embebido, sin depender de URLs externas', async () => {
      const html = await renderFicha({});

      expect(html).toMatch(
        /<img[^>]+class="logo"[^>]+src="data:image\/webp;base64,[A-Za-z0-9+/=]{100,}"/,
      );
      expect(html).not.toMatch(/src="https?:/);
    });

    it('muestra el nivel de logro y el estado legibles, sin guiones bajos', async () => {
      const html = await renderFicha({
        ficha: { promedio: '2.93', nivelLogro: 'LOGRO_ESPERADO', estado: 'FINALIZADA' },
      });

      expect(html).toContain('Logro esperado');
      expect(html).toContain('Finalizada');
      expect(html).not.toContain('LOGRO_ESPERADO');
    });

    it('repite el encabezado de la tabla de rúbricas en cada página', async () => {
      const html = await renderFicha({});

      expect(html).toMatch(/thead\s*\{[^}]*display:\s*table-header-group/);
    });
  });
});
