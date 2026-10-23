import { jest } from '@jest/globals';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { construirFichaOficialEib } from './ficha-oficial-eib.builder.js';
import { fichaOficialRaw } from './ficha-oficial-docente.fixture.js';

const SEC_I = 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE';
const SEC_II = 'II. DESARROLLO DE LA PLANIFICACIÓN A CORTO PLAZO';
const SEC_III = 'III. PLANIFICACIÓN CURRICULAR';

const item = (id: string, orden: number, nombre: string, descripcionCorta: string) => ({
  id,
  nombre,
  descripcionCorta,
  orden,
  preguntaExtra: null,
  aspectos: [],
  rubrica: [],
});

describe('PdfGeneratorService — ficha oficial EIB', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.GOTENBERG_URL = 'http://gotenberg.test:3000';
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(Buffer.from('%PDF-1.7 fake'), { status: 200 }));
  });

  afterEach(() => jest.restoreAllMocks());

  async function render(over: Parameters<typeof fichaOficialRaw>[0] = {}) {
    const base = fichaOficialRaw();
    const vista = construirFichaOficialEib(
      fichaOficialRaw({
        plantilla: {
          ...base.plantilla,
          ejesItems: [],
          desempenos: [
            item('i1', 1, 'El aula está limpia', SEC_I),
            item('a1', 2, 'Comunica el propósito', `${SEC_II} — 2.1. Interacciones pedagógicas`),
            item('a2', 3, 'Propone actividades', `${SEC_II} — 2.2. Diálogo de saberes`),
            item(
              'd1',
              4,
              'La caracterización sociocultural',
              `${SEC_III} — 3.1. Planificación anual`,
            ),
          ],
        },
        respuestasDesempeno: [
          {
            desempenoId: 'i1',
            nivel: 3,
            observaciones: 'Muy limpia',
            preguntaExtraRespuesta: null,
          },
          { desempenoId: 'a1', nivel: 2, observaciones: null, preguntaExtraRespuesta: null },
          { desempenoId: 'd1', nivel: 1, observaciones: null, preguntaExtraRespuesta: null },
        ],
        respuestasEjeItem: [],
        puntajeTotal: null,
        promedio: null,
        nivelLogro: null,
        ...over,
      }),
    );
    await new PdfGeneratorService().generatePdfFromTemplate('ficha-eib-oficial', vista);
    const form = fetchMock.mock.calls[0][1]?.body as FormData;
    const index = (form.getAll('files') as File[]).find((f) => f.name === 'index.html') as File;
    return { html: await index.text() };
  }

  it('lleva el título y las partes del formulario', async () => {
    const { html } = await render();

    for (const texto of [
      'Ficha de observación en aula para II. EE. EIB',
      'DATOS DE LA INSTITUCIÓN EDUCATIVA',
      'DATOS DEL DOCENTE',
      'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE',
      'II. DESARROLLO DE LA PLANIFICACIÓN A CORTO PLAZO',
      'III. PLANIFICACIÓN CURRICULAR',
      'ASPECTOS A MEJORAR',
      'COMPROMISO DEL DOCENTE',
    ]) {
      expect(html).toContain(texto);
    }
  });

  it('usa el banner con el logo EIB de la derecha', async () => {
    const { html } = await render();

    expect(html).toMatch(/class="banner-derecha" src="data:image\/png;base64,/);
  });

  it('cada subcriterio es una tabla con Sí, Parcialmente, No y Observación', async () => {
    const { html } = await render();

    expect(html).toContain('2.1. Interacciones pedagógicas');
    expect(html).toContain('2.2. Diálogo de saberes');
    expect(html).toMatch(
      /<th[^>]*>Ítems<\/th>\s*<th[^>]*>Sí<\/th>\s*<th[^>]*>Parcialmente<\/th>\s*<th[^>]*>No<\/th>\s*<th[^>]*>Observación<\/th>/,
    );
  });

  it('marca solo la valoración elegida de cada ítem', async () => {
    const { html } = await render();

    // i1 = Sí, a1 = Parcialmente, d1 = No, a2 sin valorar: 3 marcas en total.
    expect(html.match(/class="marca"/g)).toHaveLength(3);
    expect(html).toContain('Muy limpia');
  });

  it('escapa el texto que escribe el usuario', async () => {
    const { html } = await render({ sugerencias: '<script>alert(1)</script>' });

    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('sin fotografías no imprime la sección de evidencias', async () => {
    const { html } = await render();

    expect(html).not.toContain('EVIDENCIAS DEL MONITOREO');
  });
});
