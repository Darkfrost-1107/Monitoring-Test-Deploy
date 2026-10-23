import { construirFichaOficialDirectivo } from './ficha-oficial-directivo.builder.js';
import { fichaOficialRaw } from './ficha-oficial-docente.fixture.js';

/**
 * La ficha oficial de monitoreo al director de I.E. Tiene el diseño de la docente,
 * pero quien se evalúa es el director: sus datos ocupan el bloque del director, y no
 * hay docente, contexto de aula ni planificación.
 */

const directivo = (condicion: string | null = 'Designado') => {
  const base = fichaOficialRaw();
  return fichaOficialRaw({
    plantilla: { ...base.plantilla, ejesItems: [] },
    respuestasEjeItem: [],
    contexto: null,
    cronograma: {
      ...base.cronograma,
      evaluado: {
        ...base.cronograma.evaluado,
        condicionLaboral: condicion,
        persona: {
          nombres: 'JUAN',
          apellidos: 'PEREZ LOPEZ',
          dni: '01234567',
          correo: 'juan@ugel.gob.pe',
          telefono: '999888777',
        },
      },
    },
  });
};

describe('construirFichaOficialDirectivo', () => {
  it('el director monitoreado es el evaluado, con sus datos de contacto', () => {
    const { director } = construirFichaOficialDirectivo(directivo());

    expect(director).toMatchObject({
      nombre: 'JUAN PEREZ LOPEZ',
      dni: '01234567',
      correo: 'juan@ugel.gob.pe',
      celular: '999888777',
    });
  });

  it.each([
    ['Encargado', [true, false, false]],
    ['Por Función', [true, false, false]],
    ['Designado', [false, true, false]],
    ['Nombrado', [false, false, true]],
  ])('la condición «%s» marca la casilla que corresponde', (condicion, esperado) => {
    const { director } = construirFichaOficialDirectivo(directivo(condicion));

    expect([director.encargado, director.designado, director.nombrado]).toEqual(esperado);
  });

  it('sin condición registrada no marca ninguna casilla', () => {
    const { director } = construirFichaOficialDirectivo(directivo(null));

    expect([director.encargado, director.designado, director.nombrado]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('no lleva planificación ni consolidado de ejes: solo los desempeños', () => {
    const v = construirFichaOficialDirectivo(directivo());

    expect(v.planificacion).toEqual([]);
    expect(v.consolidado.columnas.map((c) => c.etiqueta)).toEqual(['D1', 'D2', 'D3', 'D4', 'D5']);
  });

  it('conserva el resto de la ficha: monitor, fecha, desempeños, consolidado y leyenda', () => {
    const v = construirFichaOficialDirectivo(directivo());

    expect(v.monitor.nombre).toBe('PEDRO PABLO MAMANI CRUZ');
    expect(v.desempenos).toHaveLength(5);
    expect(v.consolidado.nivel).toBe('LOGRO ESPERADO');
    expect(v.leyenda).toHaveLength(4);
  });

  it('el título lleva el año', () => {
    expect(construirFichaOficialDirectivo(directivo()).titulo).toBe(
      'FICHA DE MONITOREO Y ACOMPAÑAMIENTO AL DIRECTOR(A) DE I.E. - 2026',
    );
  });

  it('el evaluado firma como «Director», no como «Docente»', () => {
    const v = construirFichaOficialDirectivo({
      ...directivo(),
      firmas: [
        { rolFirmante: 'EVALUADOR', nombre: 'M', fecha: new Date(), imagen: null },
        { rolFirmante: 'EVALUADO', nombre: 'D', fecha: new Date(), imagen: null },
      ],
    });

    expect(v.firmas.map((f) => f.rol)).toEqual(['Monitor', 'Director']);
  });
});
