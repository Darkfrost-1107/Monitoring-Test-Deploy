import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  esDeUgel,
  plantillasVisibles,
  type AlcanceDePlantillas,
  type PlantillaVisible,
  type UsuarioDePlantillas,
} from './visibilidad-plantillas';

/**
 * Pruebas de qué plantillas ve cada usuario.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estas reglas vivían dentro de un `useMemo` de
 * `PlantillasCatalog`, en un `if/else if` de cinco ramas cuyo orden importa.
 */

interface P extends PlantillaVisible {
  id: string;
}

const plantilla = (over: Partial<P> = {}): P => ({
  id: 'p1',
  creadoPorRole: 'jefe_gestion',
  ...over,
});

const usuario = (over: Partial<UsuarioDePlantillas> = {}): UsuarioDePlantillas => ({
  role: RoleCode.ESPECIALISTA,
  ...over,
});

const ugel: AlcanceDePlantillas = { isInstitution: false, isMonitorCampo: false };
const enInstitucion: AlcanceDePlantillas = { isInstitution: true, isMonitorCampo: true };

const ids = (lista: P[]) => lista.map((p) => p.id);

describe('esDeUgel', () => {
  it('reconoce las creadas por el jefe de gestión', () => {
    expect(esDeUgel(plantilla({ creadoPorRole: 'jefe_gestion' }))).toBe(true);
  });

  it('no reconoce las creadas por un director', () => {
    expect(esDeUgel(plantilla({ creadoPorRole: 'director_ie' }))).toBe(false);
  });

  /**
   * Las plantillas anteriores al registro del rol del autor no tienen
   * `creadoPorRole`. Venían de la UGEL, así que se cuentan como suyas.
   */
  it('trata las plantillas antiguas sin autor como de la UGEL', () => {
    expect(esDeUgel(plantilla({ creadoPorRole: undefined }))).toBe(true);
  });
});

describe('plantillasVisibles — dentro de una institución', () => {
  /** El catálogo embebido en la ficha de una I.E. sólo muestra las de esa I.E. */
  it('acota a la institución que se está viendo, por encima del rol', () => {
    const lista = [
      plantilla({ id: 'suya', ieId: 'ie-1', creadoPorRole: 'director_ie' }),
      plantilla({ id: 'otra', ieId: 'ie-9', creadoPorRole: 'director_ie' }),
      plantilla({ id: 'ugel', creadoPorRole: 'jefe_gestion' }),
    ];

    const visto = plantillasVisibles(lista, usuario({ role: RoleCode.JEFE_GESTION }), ugel, {
      institucionId: 'ie-1',
    });

    expect(ids(visto)).toEqual(['suya']);
  });
});

describe('plantillasVisibles — jefe de gestión', () => {
  it('ve todas', () => {
    const lista = [
      plantilla({ id: 'ugel' }),
      plantilla({ id: 'de-ie', creadoPorRole: 'director_ie', ieId: 'ie-1' }),
    ];

    expect(ids(plantillasVisibles(lista, usuario({ role: RoleCode.JEFE_GESTION }), ugel))).toEqual([
      'ugel',
      'de-ie',
    ]);
  });
});

describe('plantillasVisibles — director de institución', () => {
  const director = (over: Partial<UsuarioDePlantillas> = {}) =>
    usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1', ...over });

  it('ve las de la UGEL y las de su propia institución', () => {
    const lista = [
      plantilla({ id: 'ugel' }),
      plantilla({ id: 'antigua', creadoPorRole: undefined }),
      plantilla({ id: 'suya', creadoPorRole: 'director_ie', ieId: 'ie-1' }),
      plantilla({ id: 'ajena', creadoPorRole: 'director_ie', ieId: 'ie-9' }),
    ];

    expect(ids(plantillasVisibles(lista, director(), ugel))).toEqual(['ugel', 'antigua', 'suya']);
  });

  /**
   * Antes se comparaba `p.ieId === user?.institucion` sin más: con ambos
   * indefinidos la comparación daba verdadero, y un director sin institución
   * asignada veía las plantillas huérfanas de otras I.E.
   */
  it('sin institución asignada no ve ninguna plantilla de institución', () => {
    const huerfana = plantilla({ id: 'huerfana', creadoPorRole: 'director_ie', ieId: undefined });

    expect(ids(plantillasVisibles([huerfana], director({ institucion: undefined }), ugel))).toEqual(
      [],
    );
  });
});

describe('plantillasVisibles — monitor de campo en una institución', () => {
  const monitor = (over: Partial<UsuarioDePlantillas> = {}) =>
    usuario({ role: RoleCode.ESPECIALISTA, institucion: 'ie-1', ...over });

  it('ve sólo la plantilla propia de su institución, sin las de la UGEL', () => {
    const lista = [
      plantilla({ id: 'ugel' }),
      plantilla({ id: 'suya', creadoPorRole: 'director_ie', ieId: 'ie-1' }),
      plantilla({ id: 'ajena', creadoPorRole: 'director_ie', ieId: 'ie-9' }),
    ];

    expect(ids(plantillasVisibles(lista, monitor(), enInstitucion))).toEqual(['suya']);
  });

  it('sin institución asignada no ve ninguna', () => {
    const huerfana = plantilla({ id: 'huerfana', creadoPorRole: 'director_ie', ieId: undefined });

    expect(
      plantillasVisibles([huerfana], monitor({ institucion: undefined }), enInstitucion),
    ).toEqual([]);
  });

  /** El mismo monitor fuera del perfil de una institución vuelve a la regla general. */
  it('fuera de una institución ve las de la UGEL', () => {
    const lista = [
      plantilla({ id: 'ugel' }),
      plantilla({ id: 'de-ie', creadoPorRole: 'director_ie', ieId: 'ie-1' }),
    ];

    expect(ids(plantillasVisibles(lista, monitor(), ugel))).toEqual(['ugel']);
  });
});

describe('plantillasVisibles — resto de roles', () => {
  it('ven sólo las de la UGEL', () => {
    const lista = [
      plantilla({ id: 'ugel' }),
      plantilla({ id: 'de-ie', creadoPorRole: 'director_ie', ieId: 'ie-1' }),
    ];

    expect(ids(plantillasVisibles(lista, usuario({ role: RoleCode.JEFE_TALLER }), ugel))).toEqual([
      'ugel',
    ]);
  });

  it('sin usuario también', () => {
    const lista = [
      plantilla({ id: 'ugel' }),
      plantilla({ id: 'de-ie', creadoPorRole: 'director_ie' }),
    ];

    expect(ids(plantillasVisibles(lista, null, ugel))).toEqual(['ugel']);
  });
});

describe('plantillasVisibles — filtro de origen por URL', () => {
  const lista = [
    plantilla({ id: 'ugel' }),
    plantilla({ id: 'antigua', creadoPorRole: undefined }),
    plantilla({ id: 'suya', creadoPorRole: 'director_ie', ieId: 'ie-1' }),
  ];
  const director = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });

  it('«ugel» deja sólo las de la UGEL, incluidas las antiguas', () => {
    expect(ids(plantillasVisibles(lista, director, ugel, { filtroUrl: 'ugel' }))).toEqual([
      'ugel',
      'antigua',
    ]);
  });

  it('«ie» deja sólo las creadas por un director', () => {
    expect(ids(plantillasVisibles(lista, director, ugel, { filtroUrl: 'ie' }))).toEqual(['suya']);
  });

  it('sin filtro no recorta lo que el rol ya permitía', () => {
    expect(ids(plantillasVisibles(lista, director, ugel, { filtroUrl: null }))).toEqual([
      'ugel',
      'antigua',
      'suya',
    ]);
  });

  /** El filtro de la URL acota lo que el rol permite; nunca lo amplía. */
  it('no muestra plantillas ajenas aunque el filtro las pida', () => {
    const ajena = plantilla({ id: 'ajena', creadoPorRole: 'director_ie', ieId: 'ie-9' });

    expect(plantillasVisibles([ajena], director, ugel, { filtroUrl: 'ie' })).toEqual([]);
  });
});
