import { construirFichaOficialDocente } from './ficha-oficial-docente.builder.js';
import { desempeno, fichaOficialRaw as raw } from './ficha-oficial-docente.fixture.js';

/**
 * La ficha oficial de monitoreo al docente, tal como la imprime la UGEL.
 *
 * El constructor recibe lo que hay en la base y devuelve lo que el formulario
 * necesita ya resuelto: qué casillas van marcadas, cómo se numeran los ítems de
 * planificación, el consolidado y la leyenda. La plantilla sólo pinta.
 */

describe('construirFichaOficialDocente — encabezado y datos', () => {
  it('lleva el año y el lema oficial del año', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.anio).toBe(2026);
    expect(v.lema).toBe('Año de la recuperación');
  });

  it('sin lema cargado, no inventa uno', () => {
    expect(construirFichaOficialDocente(raw({ lema: null })).lema).toBeNull();
  });

  it('completa la institución, el docente y el contexto de aula', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.institucion).toMatchObject({
      nombre: 'JOSE CARLOS MARIATEGUI',
      codigoModular: '0548081',
    });
    expect(v.docente).toMatchObject({
      nombre: 'MARLENE GAONA MACHACA',
      dni: '40797767',
      area: 'Ciencia y Tecnología',
      grado: '3',
      seccion: 'C',
      estudiantes: '21',
      nee: '2',
    });
  });

  it('marca la condición laboral del docente', () => {
    const nombrado = construirFichaOficialDocente(raw()).docente;
    expect([nombrado.nombrado, nombrado.contratado, nombrado.otro]).toEqual([true, false, false]);

    const otro = construirFichaOficialDocente(
      raw({
        cronograma: {
          ...raw().cronograma,
          evaluado: { ...raw().cronograma.evaluado, condicionLaboral: 'Destacado' },
        },
      }),
    ).docente;
    expect([otro.nombrado, otro.contratado, otro.otro]).toEqual([false, false, true]);
  });

  it('marca la forma en que ejerce el director', () => {
    const d = construirFichaOficialDocente(raw()).director;

    expect([d.encargado, d.designado, d.porFunciones]).toEqual([false, true, false]);
  });

  it('sin director registrado deja sus datos en blanco, no en «undefined»', () => {
    const d = construirFichaOficialDocente(raw({ director: null })).director;

    expect(d).toMatchObject({ nombre: '', dni: '', correo: '', celular: '' });
    expect([d.encargado, d.designado, d.porFunciones]).toEqual([false, false, false]);
  });

  it('el monitor del equipo de la UGEL marca «UGEL»', () => {
    const m = construirFichaOficialDocente(raw()).monitor;

    expect(m.nombre).toBe('PEDRO PABLO MAMANI CRUZ');
    expect([m.drep, m.ugel, m.directorIe, m.coordinador]).toEqual([false, true, false, false]);
  });

  it.each([
    ['DREP', [true, false, false, false]],
    ['Director', [false, false, true, false]],
    ['Coordinador Pedagógico', [false, false, false, true]],
    ['Jefe de Taller', [false, false, false, true]],
  ])('el cargo %s marca la casilla que corresponde', (cargo, esperado) => {
    const base = raw();
    const m = construirFichaOficialDocente(
      raw({ cronograma: { ...base.cronograma, monitor: { ...base.cronograma.monitor, cargo } } }),
    ).monitor;

    expect([m.drep, m.ugel, m.directorIe, m.coordinador]).toEqual(esperado);
  });

  it('la fecha es la programada, sin correrse un día por la zona horaria', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.fecha).toContain('16');
    expect(v.fecha.toLowerCase()).toContain('octubre');
  });

  it('la hora final sale de la finalización, en hora de Lima', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.horaInicio).toContain('12:23');
    expect(v.horaFinal).toContain('12:25');
  });

  it('una ficha sin hora de cierre deja la hora final en blanco', () => {
    expect(construirFichaOficialDocente(raw({ finalizadaAt: null })).horaFinal).toBe('');
  });
});

describe('construirFichaOficialDocente — desempeños', () => {
  it('ordena los desempeños, sus aspectos y su rúbrica de I a IV', () => {
    const [d1] = construirFichaOficialDocente(raw()).desempenos;

    expect(d1.aspectos).toEqual(['Primer aspecto', 'Segundo aspecto']);
    expect(d1.rubrica.map((r) => r.romano)).toEqual(['I', 'II', 'III', 'IV']);
  });

  it('marca sólo la casilla del nivel elegido, sobre la diagonal de la tabla', () => {
    const d1 = construirFichaOficialDocente(raw()).desempenos[0]; // nivel IV

    expect(d1.rubrica.map((r) => r.celdas)).toEqual([
      ['libre', 'gris', 'gris', 'gris'],
      ['gris', 'libre', 'gris', 'gris'],
      ['gris', 'gris', 'libre', 'gris'],
      ['gris', 'gris', 'gris', 'marcada'],
    ]);
  });

  it('un desempeño sin calificar no marca nada', () => {
    const base = raw();
    const v = construirFichaOficialDocente(
      raw({ respuestasDesempeno: base.respuestasDesempeno.slice(1) }),
    );

    expect(v.desempenos[0].rubrica.flatMap((r) => r.celdas)).not.toContain('marcada');
  });

  it('lleva las observaciones del desempeño como evidencias', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.desempenos[0].evidencias).toBe('Muy bien');
    expect(v.desempenos[1].evidencias).toBe('');
  });

  it.each([
    [1, 'El aspecto que se considera en esta rúbrica es el siguiente:'],
    [2, 'Los aspectos que se consideran en esta rúbrica son dos:'],
    [3, 'Los aspectos que se consideran en esta rúbrica son tres:'],
  ])('con %i aspecto(s) la frase del formulario es la oficial', (cantidad, frase) => {
    const base = raw();
    const aspectos = [1, 2, 3].slice(0, cantidad).map((n) => ({
      id: `a${n}`,
      descripcion: `Aspecto ${n}`,
      orden: n,
    }));
    const v = construirFichaOficialDocente(
      raw({
        plantilla: {
          ...base.plantilla,
          desempenos: [desempeno(1, { aspectos })],
        },
        respuestasDesempeno: [base.respuestasDesempeno[0]],
      }),
    );

    expect(v.desempenos[0].introAspectos).toBe(frase);
  });

  it('la pregunta extra muestra Sí o No según lo respondido', () => {
    const base = raw();
    const conPregunta = (respuesta: boolean | null) =>
      construirFichaOficialDocente(
        raw({
          plantilla: {
            ...base.plantilla,
            desempenos: [desempeno(1, { preguntaExtra: 'Marque Sí si hubo maltrato' })],
          },
          respuestasDesempeno: [
            { ...base.respuestasDesempeno[0], preguntaExtraRespuesta: respuesta },
          ],
        }),
      ).desempenos[0].preguntaExtra;

    expect(conPregunta(true)).toEqual({ texto: 'Marque Sí si hubo maltrato', si: true, no: false });
    expect(conPregunta(false)).toEqual({
      texto: 'Marque Sí si hubo maltrato',
      si: false,
      no: true,
    });
    expect(conPregunta(null)).toEqual({
      texto: 'Marque Sí si hubo maltrato',
      si: false,
      no: false,
    });
  });

  it('un desempeño sin pregunta extra no la muestra', () => {
    expect(construirFichaOficialDocente(raw()).desempenos[0].preguntaExtra).toBeNull();
  });
});

describe('construirFichaOficialDocente — planificación y diseño de evaluación', () => {
  it('numera los ítems a continuación de los desempeños: R6, R7', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.planificacion.map((p) => p.etiqueta)).toEqual(['R6', 'R7']);
    expect(v.planificacion.map((p) => p.descripcion)).toEqual([
      'Planifica el proceso',
      'Diseña una evaluación',
    ]);
  });

  it('muestra el número solo, como la columna R del formulario, y la observación como evidencia', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.planificacion.map((p) => p.numero)).toEqual([6, 7]);
    expect(v.planificacion.map((p) => p.evidencias)).toEqual(['Planifica bien', '']);
  });

  it('marca el nivel de logro de cada ítem', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.planificacion[0].casillas).toEqual([false, false, true, false]);
    expect(v.planificacion[1].casillas).toEqual([false, true, false, false]);
  });

  it('un ítem sin respuesta no marca nada', () => {
    const v = construirFichaOficialDocente(raw({ respuestasEjeItem: [] }));

    expect(v.planificacion[0].casillas).toEqual([false, false, false, false]);
  });
});

describe('construirFichaOficialDocente — consolidado y leyenda', () => {
  it('arma las columnas D1..D5 y R6..R7 con su puntaje', () => {
    const c = construirFichaOficialDocente(raw()).consolidado;

    expect(c.columnas.map((x) => x.etiqueta)).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'R6', 'R7']);
    expect(c.columnas.map((x) => x.puntaje)).toEqual([4, 1, 3, 2, 3, 3, 2]);
  });

  it('el total, el promedio y el nivel salen de la ficha guardada', () => {
    const c = construirFichaOficialDocente(raw()).consolidado;

    expect(c.total).toBe(13);
    expect(c.promedio).toBe('2,60');
    expect(c.nivel).toBe('LOGRO ESPERADO');
  });

  it('una ficha informativa no lleva total, promedio ni nivel', () => {
    const c = construirFichaOficialDocente(
      raw({ puntajeTotal: null, promedio: null, nivelLogro: null }),
    ).consolidado;

    expect([c.total, c.promedio, c.nivel]).toEqual([null, null, null]);
  });

  it('la leyenda para cinco desempeños es la tabla oficial', () => {
    const v = construirFichaOficialDocente(raw());

    expect(v.leyenda).toEqual([
      { total: '[5 - 7]', promedio: '1 - 1,4', nivel: 'INICIO' },
      { total: '[8 - 12]', promedio: '1,6 - 2,4', nivel: 'EN PROCESO' },
      { total: '[13 - 17]', promedio: '2,6 - 3,4', nivel: 'LOGRO ESPERADO' },
      { total: '[18 - 20]', promedio: '3,6 - 4', nivel: 'LOGRO DESTACADO' },
    ]);
  });

  it('con otra cantidad de desempeños la leyenda se ajusta al promedio', () => {
    const base = raw();
    const v = construirFichaOficialDocente(
      raw({
        plantilla: { ...base.plantilla, desempenos: [1, 2, 3, 4].map((n) => desempeno(n)) },
      }),
    );

    expect(v.leyenda.map((f) => f.total)).toEqual([
      '[4 - 6]',
      '[7 - 10]',
      '[11 - 14]',
      '[15 - 16]',
    ]);
  });
});

describe('construirFichaOficialDocente — cierre', () => {
  it('lleva las observaciones, sugerencias y compromisos', () => {
    const v = construirFichaOficialDocente(raw());

    expect([v.observaciones, v.sugerencias, v.compromisos]).toEqual([
      'Observación general',
      'Una sugerencia',
      'Un compromiso',
    ]);
  });

  it('muestra las firmas con su rol, firmante y fecha', () => {
    const v = construirFichaOficialDocente(
      raw({
        firmas: [
          {
            rolFirmante: 'EVALUADOR',
            nombre: 'PEDRO PABLO MAMANI CRUZ',
            fecha: new Date('2026-10-16T17:30:00Z'),
            imagen: 'data:image/png;base64,AAA',
          },
          {
            rolFirmante: 'EVALUADO',
            nombre: 'MARLENE GAONA MACHACA',
            fecha: new Date('2026-10-16T18:00:00Z'),
            imagen: null,
          },
        ],
      }),
    );

    expect(v.firmas.map((f) => f.rol)).toEqual(['Monitor', 'Docente']);
    expect(v.firmas[0]).toMatchObject({
      nombre: 'PEDRO PABLO MAMANI CRUZ',
      imagen: 'data:image/png;base64,AAA',
    });
    expect(v.firmas[1].imagen).toBeNull();
  });

  it('lleva las evidencias fotográficas', () => {
    const v = construirFichaOficialDocente(raw({ evidencias: ['data:image/jpeg;base64,BBB'] }));

    expect(v.evidencias).toEqual(['data:image/jpeg;base64,BBB']);
  });
});
