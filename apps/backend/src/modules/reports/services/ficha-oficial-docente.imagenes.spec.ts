import {
  completarImagenes,
  type FichaOficialPersistida,
} from './ficha-oficial-docente.imagenes.js';
import { fichaOficialRaw } from './ficha-oficial-docente.fixture.js';

/**
 * Lo que se guarda de una ficha lleva rutas a archivos; el formulario necesita
 * las imágenes ya incrustadas.
 */

const { firmas: _firmas, evidencias: _evidencias, ...sinImagenes } = fichaOficialRaw();

const persistida = (over: Partial<FichaOficialPersistida> = {}): FichaOficialPersistida => ({
  ...sinImagenes,
  firmas: [],
  evidenciaGeneral: null,
  ...over,
});

/** Un resolvedor de prueba como el real: sólo conoce rutas de uploads/, y «falta» no existe. */
const resolver = (ref: string | null | undefined) =>
  Promise.resolve(ref?.startsWith('/uploads/') && !ref.includes('falta') ? `img:${ref}` : null);

describe('completarImagenes', () => {
  it('resuelve la imagen de cada firma', async () => {
    const f = await completarImagenes(
      persistida({
        firmas: [
          { rolFirmante: 'EVALUADOR', nombre: 'A', fecha: new Date(), imagenUrl: '/uploads/a.png' },
          { rolFirmante: 'EVALUADO', nombre: 'B', fecha: new Date(), imagenUrl: null },
        ],
      }),
      resolver,
    );

    expect(f.firmas.map((x) => x.imagen)).toEqual(['img:/uploads/a.png', null]);
  });

  it('una firma cuyo archivo falta se muestra sin imagen, no se descarta', async () => {
    const f = await completarImagenes(
      persistida({
        firmas: [
          {
            rolFirmante: 'EVALUADOR',
            nombre: 'A',
            fecha: new Date(),
            imagenUrl: '/uploads/falta.png',
          },
        ],
      }),
      resolver,
    );

    expect(f.firmas).toHaveLength(1);
    expect(f.firmas[0].imagen).toBeNull();
  });

  it('lee las evidencias generales de un JSON de ranuras, en orden', async () => {
    const f = await completarImagenes(
      persistida({
        evidenciaGeneral: JSON.stringify({
          GENERAL_2: '/uploads/dos.png',
          GENERAL_1: '/uploads/uno.png',
        }),
      }),
      resolver,
    );

    expect(f.evidencias).toEqual(['img:/uploads/uno.png', 'img:/uploads/dos.png']);
  });

  it('lee una evidencia suelta de las fichas anteriores a las ranuras', async () => {
    const f = await completarImagenes(
      persistida({ evidenciaGeneral: '/uploads/vieja.png' }),
      resolver,
    );

    expect(f.evidencias).toEqual(['img:/uploads/vieja.png']);
  });

  it('un JSON corrupto se trata como una referencia suelta, no revienta', async () => {
    const f = await completarImagenes(persistida({ evidenciaGeneral: '{ no es json' }), resolver);

    expect(f.evidencias).toEqual([]);
  });

  it('descarta las evidencias cuyo archivo no se pudo leer', async () => {
    const f = await completarImagenes(
      persistida({
        evidenciaGeneral: JSON.stringify({
          GENERAL_1: '/uploads/falta.png',
          GENERAL_2: '/uploads/ok.png',
        }),
      }),
      resolver,
    );

    expect(f.evidencias).toEqual(['img:/uploads/ok.png']);
  });

  it('sin evidencia general no hay fotos', async () => {
    expect((await completarImagenes(persistida(), resolver)).evidencias).toEqual([]);
  });

  it('conserva el resto de la ficha tal cual', async () => {
    const f = await completarImagenes(persistida(), resolver);

    expect(f.anioAcademico).toBe(sinImagenes.anioAcademico);
    expect(f.cronograma).toBe(sinImagenes.cronograma);
  });
});
