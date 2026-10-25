import { construirFichaOficialEib } from './ficha-oficial-eib.builder.js';
import { fichaOficialRaw } from './ficha-oficial-docente.fixture.js';

/**
 * La ficha oficial de observación en aula para II. EE. EIB. Es una lista de cotejo:
 * cada ítem se valora Sí, Parcialmente o No, y los ítems se agrupan por sección y
 * subcriterio, que la plantilla guarda en `descripcionCorta` como «Sección — Subcriterio».
 */

const SEC_I = 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE';
const SEC_II = 'II. DESARROLLO DE LA PLANIFICACIÓN A CORTO PLAZO';
const SEC_III = 'III. PLANIFICACIÓN CURRICULAR';

const item = (id: string, orden: number, nombre: string, descripcionCorta: string | null) => ({
  id,
  nombre,
  descripcionCorta,
  orden,
  preguntaExtra: null,
  aspectos: [],
  rubrica: [],
});

const eib = (over: Parameters<typeof fichaOficialRaw>[0] = {}) => {
  const base = fichaOficialRaw();
  return fichaOficialRaw({
    plantilla: {
      ...base.plantilla,
      ejesItems: [],
      desempenos: [
        item('i1', 1, 'El aula está limpia', SEC_I),
        item('i2', 2, 'El aula está letrada', SEC_I),
        item('a1', 3, 'Comunica el propósito', `${SEC_II} — 2.1. Interacciones pedagógicas`),
        item('a2', 4, 'Atiende los niveles', `${SEC_II} — 2.1. Interacciones pedagógicas`),
        item('a3', 5, 'Propone actividades', `${SEC_II} — 2.2. Diálogo de saberes`),
        item(
          'd1',
          6,
          'La caracterización sociocultural',
          `${SEC_III} — 3.1. La planificación anual`,
        ),
      ],
    },
    respuestasDesempeno: [
      { desempenoId: 'i1', nivel: 3, observaciones: 'Muy limpia', preguntaExtraRespuesta: null },
      { desempenoId: 'i2', nivel: 1, observaciones: null, preguntaExtraRespuesta: null },
      { desempenoId: 'a1', nivel: 2, observaciones: 'A medias', preguntaExtraRespuesta: null },
      { desempenoId: 'a3', nivel: 3, observaciones: null, preguntaExtraRespuesta: null },
    ],
    respuestasEjeItem: [],
    puntajeTotal: null,
    promedio: null,
    nivelLogro: null,
    ...over,
  });
};

describe('construirFichaOficialEib — bloques de la lista de cotejo', () => {
  it('agrupa por sección en el orden de la plantilla', () => {
    const { bloques } = construirFichaOficialEib(eib());

    expect(bloques.map((b) => b.seccion)).toEqual([SEC_I, SEC_II, SEC_III]);
  });

  it('las secciones I y II son de observación en aula; la III, de revisión de documentos', () => {
    const { bloques } = construirFichaOficialEib(eib());

    expect(bloques.map((b) => b.tipo)).toEqual(['AULA', 'AULA', 'DOCUMENTAL']);
  });

  it('agrupa en subcriterios dentro de cada sección', () => {
    const { bloques } = construirFichaOficialEib(eib());

    expect(bloques[1].subcriterios.map((s) => s.titulo)).toEqual([
      '2.1. Interacciones pedagógicas',
      '2.2. Diálogo de saberes',
    ]);
    expect(bloques[1].subcriterios[0].items.map((i) => i.texto)).toEqual([
      'Comunica el propósito',
      'Atiende los niveles',
    ]);
  });

  it('una sección sin subcriterio tiene uno solo, sin título', () => {
    const { bloques } = construirFichaOficialEib(eib());

    expect(bloques[0].subcriterios).toHaveLength(1);
    expect(bloques[0].subcriterios[0].titulo).toBe('');
    expect(bloques[0].subcriterios[0].items).toHaveLength(2);
  });

  it('ordena los ítems por su orden aunque lleguen desordenados', () => {
    const base = eib();
    const { bloques } = construirFichaOficialEib(
      eib({
        plantilla: { ...base.plantilla, desempenos: [...base.plantilla.desempenos].reverse() },
      }),
    );

    expect(bloques.map((b) => b.seccion)).toEqual([SEC_I, SEC_II, SEC_III]);
    expect(bloques[0].subcriterios[0].items.map((i) => i.texto)).toEqual([
      'El aula está limpia',
      'El aula está letrada',
    ]);
  });

  it('un ítem sin sección va en «Condiciones básicas», como en la pantalla de llenado', () => {
    const base = eib();
    const { bloques } = construirFichaOficialEib(
      eib({
        plantilla: {
          ...base.plantilla,
          desempenos: [item('x', 1, 'Sin sección', null)],
        },
        respuestasDesempeno: [],
      }),
    );

    expect(bloques[0].seccion).toBe(SEC_I);
  });

  it.each([
    ['con raya larga', `${SEC_II} — 2.1. Uno`],
    ['con salto de línea', `${SEC_II}\\n2.1. Uno`.replace('\\n', '\n')],
    ['con guion', `${SEC_II} - 2.1. Uno`],
  ])('entiende el subcriterio separado %s', (_n, corta) => {
    const base = eib();
    const { bloques } = construirFichaOficialEib(
      eib({
        plantilla: { ...base.plantilla, desempenos: [item('x', 1, 'T', corta)] },
        respuestasDesempeno: [],
      }),
    );

    expect(bloques[0].seccion).toBe(SEC_II);
    expect(bloques[0].subcriterios[0].titulo).toBe('2.1. Uno');
  });
});

describe('construirFichaOficialEib — valoración', () => {
  const valores = () =>
    construirFichaOficialEib(eib()).bloques.flatMap((b) =>
      b.subcriterios.flatMap((s) => s.items.map((i) => i.valor)),
    );

  it('3 es Sí, 2 es Parcialmente, 1 es No, y sin respuesta no marca nada', () => {
    expect(valores()).toEqual(['si', 'no', 'parcial', null, 'si', null]);
  });

  it('lleva la observación de cada ítem', () => {
    const items = construirFichaOficialEib(eib()).bloques[0].subcriterios[0].items;

    expect(items.map((i) => i.observacion)).toEqual(['Muy limpia', '']);
  });
});

describe('construirFichaOficialEib — datos del formulario', () => {
  it('el título lleva el nivel de la institución', () => {
    expect(construirFichaOficialEib(eib()).titulo).toBe(
      'Ficha de observación en aula para II. EE. EIB – Secundaria',
    );
  });

  it('los datos de la IE salen de la institución', () => {
    const { ie } = construirFichaOficialEib(eib());

    expect(ie).toMatchObject({
      nombre: 'JOSE CARLOS MARIATEGUI',
      codigoModular: '0548081',
      lugar: 'Jr. Los Andes 123',
      distrito: 'Palca',
      provincia: 'Lampa',
      region: 'Puno',
    });
  });

  it('lo que el sistema no captura queda en blanco, como en el formulario en papel', () => {
    const v = construirFichaOficialEib(eib());

    expect(v.ie.formaDeAtencion).toBe('');
    expect(v.docente.codigoModular).toBe('');
    expect(v.planificacion).toEqual({
      nombre: '',
      duracion: '',
      sesion: '',
      competencias: '',
      area: 'Ciencia y Tecnología',
    });
  });

  it('el docente observado lleva su nombre y su DNI', () => {
    const { docente } = construirFichaOficialEib(eib());

    expect(docente).toMatchObject({ nombre: 'MARLENE GAONA MACHACA', dni: '40797767' });
  });

  it('las observaciones finales: lo sugerido son los aspectos a mejorar y los compromisos son del docente', () => {
    const v = construirFichaOficialEib(eib());

    expect(v.aspectosAMejorar).toBe('Una sugerencia');
    expect(v.compromisoDelDocente).toBe('Un compromiso');
    expect(v.observacionesGenerales).toBe('Observación general');
    expect(v.fortalezas).toBe('');
    expect(v.compromisoDelEspecialista).toBe('');
  });

  it('las tres firmas del formulario van en su orden, y el director queda sin firma', () => {
    const v = construirFichaOficialEib(
      eib({
        firmas: [
          {
            rolFirmante: 'EVALUADOR',
            nombre: 'PEDRO',
            fecha: new Date(),
            imagen: 'data:image/png;base64,AAA',
          },
          {
            rolFirmante: 'EVALUADO',
            nombre: 'MARLENE',
            fecha: new Date(),
            imagen: 'data:image/png;base64,BBB',
          },
        ],
      }),
    );

    expect(v.firmasEib.map((f) => f.rol)).toEqual([
      'Docente de aula',
      'Especialista de UGEL',
      'Director de la IE.',
    ]);
    expect(v.firmasEib.map((f) => f.imagen)).toEqual([
      'data:image/png;base64,BBB',
      'data:image/png;base64,AAA',
      null,
    ]);
  });

  it('conserva fecha, horas y fotografías de evidencia', () => {
    const v = construirFichaOficialEib(eib({ evidencias: ['data:image/jpeg;base64,CCC'] }));

    expect(v.fecha).toContain('octubre');
    expect(v.horaInicio).toContain('12:23');
    expect(v.evidencias).toEqual(['data:image/jpeg;base64,CCC']);
  });
});
