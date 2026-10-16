import { jest } from '@jest/globals';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { construirFichaOficialDocente } from './ficha-oficial-docente.builder.js';
import { fichaOficialRaw } from './ficha-oficial-docente.fixture.js';

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

    it('en un instrumento informativo la regla tiene tres valoraciones: No, Parcialmente y Sí', async () => {
      const html = await renderFicha({
        ficha: { promedio: null, nivelLogro: null },
        respuestas: [{ nombre: 'A', nivel: 2, observaciones: '—' }],
      });

      expect(html).toMatch(/class="paso texto nivel-2 activo"[^>]*>\s*Parcialmente\s*</);
      expect(html.match(/class="paso texto nivel-\d( activo)?"/g)).toHaveLength(3);
      expect(html).not.toMatch(/>\s*IV\s*</);
      expect(html).toMatch(/<th>Valoración<\/th>/);
      expect(html).not.toMatch(/<th>Nivel<\/th>/);
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

describe('PdfGeneratorService — ficha oficial al docente', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.GOTENBERG_URL = 'http://gotenberg.test:3000';
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
  });

  afterEach(() => jest.restoreAllMocks());

  async function render(over: Parameters<typeof fichaOficialRaw>[0] = {}) {
    const vista = construirFichaOficialDocente(fichaOficialRaw(over));
    await new PdfGeneratorService().generatePdfFromTemplate('ficha-docente-oficial', vista);
    const form = fetchMock.mock.calls[0][1]?.body as FormData;
    const archivo = (nombre: string) =>
      (form.getAll('files') as File[]).find((f) => f.name === nombre);
    return {
      form,
      html: await (archivo('index.html') as File).text(),
    };
  }

  it('lleva el título y las secciones del formulario oficial', async () => {
    const { html } = await render();

    for (const texto of [
      'FICHA DE MONITOREO AL DOCENTE 2026',
      'DATOS DE LA INSTITUCIÓN EDUCATIVA:',
      'DATOS DEL DOCENTE MONITOREADO:',
      'DATOS DEL(OS) MONITOR(ES):',
      'FECHA Y DURACIÓN:',
      'NIVELES DEL LOGRO:',
      'OBSERVACIÓN DE AULA',
      'PLANIFICACIÓN Y DISEÑO DE EVALUACIÓN',
      'SUGERENCIAS Y COMPROMISOS:',
      'CONSOLIDADO DE NIVELES DE LOGRO:',
      'LEYENDA',
    ]) {
      expect(html).toContain(texto);
    }
  });

  it('las opciones se muestran como casillas: una marcada por grupo, el resto vacías', async () => {
    const { html } = await render();

    // Director (3), docente (3) y monitor (4): diez casillas, con una marcada en cada grupo.
    expect(html.match(/class="caja-x marcada"/g)).toHaveLength(3);
    expect(html.match(/class="caja-x"/g)).toHaveLength(7);
  });

  it('el correo tiene ancho de sobra y no se parte a la mitad de la palabra', async () => {
    const { html } = await render();

    expect(html.match(/E-MAIL:<\/td>\s*<td colspan="4" class="correo">/g)).toHaveLength(3);
  });

  it('cada sección lleva su rótulo en una franja con acento', async () => {
    const { html } = await render();

    expect(html.match(/class="seccion"/g)!.length).toBeGreaterThanOrEqual(6);
    expect(html).toMatch(/\.seccion\s*\{[^}]*border-left/);
  });

  it('el banner institucional va en la cabecera de la tabla, que se repite en cada página', async () => {
    const { html } = await render();

    expect(html).toContain('GOBIERNO');
    expect(html).toContain('REGIONAL PUNO');
    expect(html).toContain('Regional de Educación');
    expect(html).toContain('Gestión Pedagógica');
    expect(html).toMatch(/<thead>\s*<tr>\s*<td[^>]*>\s*<div class="banner">/);
    expect(html).toMatch(/thead\s*\{[^}]*display:\s*table-header-group/);
  });

  it('muestra el lema oficial entre comillas, debajo del banner', async () => {
    const { html } = await render();

    expect(html).toMatch(/class="lema">\s*&ldquo;Año de la recuperación&rdquo;/);
  });

  it('sin lema cargado no deja una línea vacía', async () => {
    const { html } = await render({ lema: null });

    expect(html).not.toContain('class="lema"');
  });

  it('el banner no depende de imágenes externas', async () => {
    const { html } = await render();

    expect(html).toMatch(/<img[^>]+class="logo"[^>]+src="data:image\/webp;base64,/);
    expect(html).not.toMatch(/src="https?:/);
  });

  it('no usa el encabezado de Gotenberg: el margen superior es el normal', async () => {
    const { form } = await render();

    expect(Number(form.get('marginTop'))).toBeLessThan(0.6);
  });

  it('la rúbrica se puede partir entre filas: ninguna celda abarca toda la tabla', async () => {
    const { html } = await render();

    // Una celda vertical «NIVEL» que abarcara las cuatro filas obliga a que toda la rúbrica
    // salte junta a la hoja siguiente y deje un hueco en la anterior.
    expect(html).not.toMatch(/rowspan="[3-9]"/);
  });

  it('la cabecera de niveles de cada desempeño se repite si su rúbrica cruza de página', async () => {
    const { html } = await render();

    // Una cabecera para el banner y una por cada uno de los 5 desempeños.
    expect(html.match(/<thead>/g)).toHaveLength(1 + 5);
  });

  it('las evidencias de cada desempeño viajan con su última fila de niveles', async () => {
    const { html } = await render();

    // Sin esto, una cabecera repetida podría quedar sobre una fila de evidencias suelta.
    expect(html.match(/<tr class="junto">/g)).toHaveLength(5);
  });

  it('la leyenda no se pega al consolidado: puede pasar sola a la hoja siguiente', async () => {
    const { html } = await render();

    const consolidado = html.indexOf('CONSOLIDADO DE NIVELES DE LOGRO');
    const leyenda = html.indexOf('class="leyenda-titulo"');
    const cierreDelBloque = html.indexOf('</table>\n  </div>', consolidado);

    expect(cierreDelBloque).toBeGreaterThan(consolidado);
    expect(cierreDelBloque).toBeLessThan(leyenda);
  });

  it('marca una casilla por desempeño calificado y deja el resto en gris', async () => {
    const { html } = await render();

    expect(html.match(/class="marca"/g)).toHaveLength(5);
    expect(html.match(/class="gris"/g)).toHaveLength(5 * 12);
  });

  it('cada desempeño muestra su descripción, sus aspectos y su rúbrica', async () => {
    const { html } = await render();

    expect(html).toContain('DESEMPEÑO 1: CRITERIO 1');
    expect(html).toContain('Descripción del desempeño 1');
    expect(html).toContain('Los aspectos que se consideran en esta rúbrica son dos:');
    expect(html).toContain('Primer aspecto');
    expect(html).toContain('Descripción nivel IV');
  });

  it('las observaciones del desempeño van en «Evidencias (conductas observadas)»', async () => {
    const { html } = await render();

    expect(html).toContain('EVIDENCIAS (CONDUCTAS OBSERVADAS)');
    expect(html).toContain('Muy bien');
  });

  it('la pregunta extra se muestra con su respuesta Sí/No', async () => {
    const base = fichaOficialRaw();
    const { html } = await render({
      plantilla: {
        ...base.plantilla,
        desempenos: base.plantilla.desempenos.map((d, i) =>
          i === 0 ? { ...d, preguntaExtra: 'Marque «Sí» si hubo maltrato' } : d,
        ),
      },
      respuestasDesempeno: base.respuestasDesempeno.map((r, i) =>
        i === 0 ? { ...r, preguntaExtraRespuesta: false } : r,
      ),
    });

    expect(html).toContain('Marque «Sí» si hubo maltrato');
    expect(html).toMatch(/Sí:\s*<span class="casilla"><\/span>/);
    expect(html).toMatch(/No:\s*<span class="casilla">X<\/span>/);
  });

  it('la planificación muestra R6 y R7 con su nivel y su evidencia', async () => {
    const { html } = await render();

    expect(html).toContain('Planifica el proceso');
    expect(html).toContain('Planifica bien');
    expect(html.match(/class="marca-plan"/g)).toHaveLength(2);
  });

  it('el consolidado trae las columnas, el total, el promedio y el nivel', async () => {
    const { html } = await render();

    for (const texto of ['D1', 'D5', 'R6', 'R7', '2,60', 'LOGRO ESPERADO']) {
      expect(html).toContain(texto);
    }
  });

  it('la leyenda trae las cuatro franjas oficiales', async () => {
    const { html } = await render();

    for (const texto of [
      '[5 - 7]',
      '[8 - 12]',
      '[13 - 17]',
      '[18 - 20]',
      'INICIO',
      'LOGRO DESTACADO',
    ]) {
      expect(html).toContain(texto);
    }
  });

  it('las firmas llevan su imagen, y sin imagen no queda un ícono roto', async () => {
    const { html } = await render({
      firmas: [
        {
          rolFirmante: 'EVALUADOR',
          nombre: 'PEDRO MAMANI',
          fecha: new Date(),
          imagen: 'data:image/png;base64,AAA',
        },
        { rolFirmante: 'EVALUADO', nombre: 'MARLENE GAONA', fecha: new Date(), imagen: null },
      ],
    });

    expect(html).toContain('PEDRO MAMANI');
    expect(html.match(/<img class="firma-img"/g)).toHaveLength(1);
  });

  it('muestra las fotografías de evidencia cuando las hay', async () => {
    const { html } = await render({ evidencias: ['data:image/jpeg;base64,BBB'] });

    expect(html).toContain('EVIDENCIAS DEL MONITOREO');
    expect(html.match(/<img class="evidencia-img"/g)).toHaveLength(1);
  });

  it('sin fotografías no muestra la sección de evidencias del monitoreo', async () => {
    const { html } = await render({ evidencias: [] });

    expect(html).not.toContain('EVIDENCIAS DEL MONITOREO');
  });

  it('escapa el texto que escribe el usuario', async () => {
    const { html } = await render({ sugerencias: '<script>alert(1)</script>' });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('una ficha informativa no inventa promedio ni nivel', async () => {
    const { html } = await render({ puntajeTotal: null, promedio: null, nivelLogro: null });

    expect(html).not.toMatch(/data-consolidado="nivel">\s*LOGRO ESPERADO/);
    expect(html).not.toMatch(/data-consolidado="promedio">\s*\d/);
  });
});
