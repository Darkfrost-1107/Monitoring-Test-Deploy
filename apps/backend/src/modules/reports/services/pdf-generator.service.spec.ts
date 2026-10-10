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

    it('muestra cada nivel de rúbrica como insignia con la clase de su nivel', async () => {
      const html = await renderFicha({
        respuestas: [
          { nombre: 'A', nivel: 1, observaciones: '—' },
          { nombre: 'B', nivel: 4, observaciones: '—' },
        ],
      });

      expect(html).toMatch(/class="nivel-badge nivel-1"[^>]*>\s*1\s*</);
      expect(html).toMatch(/class="nivel-badge nivel-4"[^>]*>\s*4\s*</);
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
        ficha: { nivelLogro: 'LOGRO_ESPERADO', estado: 'FINALIZADA' },
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
