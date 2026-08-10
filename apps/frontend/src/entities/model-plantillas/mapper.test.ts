import { describe, it, expect } from 'vitest';
import type { IPlantilla } from '@sistema-monitoreo/shared-contracts';
import { mapIPlantillaToPlantilla } from './mapper';

/**
 * Pruebas de la fecha de creación de una plantilla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. `createdAt` es un **instante**, y el mapeo lo
 * cortaba por la «T» para quedarse con el día:
 *
 * ```ts
 * if (!iso) return hoyISO();
 * return iso.split('T')[0];
 * ```
 *
 * Eso devuelve el día en UTC. En Perú (UTC-5) todo lo creado después de las
 * 19:00 aparecía con la fecha del día siguiente. Y sin `createdAt` mostraba la
 * fecha de hoy, de modo que una plantilla sin fecha se veía como creada recién.
 *
 * Las pruebas corren con `TZ: 'America/Lima'`, fijada en `vitest.config.ts`.
 */

const iPlantilla = (over: Partial<IPlantilla> = {}): IPlantilla =>
  ({
    id: 'p1',
    tipo: 'DOCENTE',
    anioAcademico: 2026,
    estado: 'Vigente',
    descripcion: 'Ficha',
    baremo: 'Vigente',
    desempenos: [],
    nivelesCalificacion: [],
    createdAt: '2026-03-09T12:00:00.000Z',
    ...over,
  }) as IPlantilla;

describe('mapIPlantillaToPlantilla — fecha de creación', () => {
  it('conserva el día cuando el instante cae dentro del mismo día en Perú', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ createdAt: '2026-03-09T12:00:00.000Z' }));
    expect(p.fechaCreacion).toBe('2026-03-09');
  });

  /**
   * Martes 9 a las 20:00 en Lima es miércoles 10 a las 01:00 UTC. Cortar por la
   * «T» devolvía el 10; la plantilla se creó el 9.
   */
  it('no adelanta un día lo creado de noche en Perú', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ createdAt: '2026-03-10T01:00:00.000Z' }));
    expect(p.fechaCreacion).toBe('2026-03-09');
  });

  /**
   * Sin fecha se devuelve vacío y el catálogo muestra «—». Antes devolvía el
   * día de hoy, que es un dato inventado.
   */
  it('sin createdAt no inventa la fecha de hoy', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ createdAt: '' }));
    expect(p.fechaCreacion).toBe('');
  });
});

/**
 * El catálogo necesita decir de quién es cada plantilla: con una vigente por
 * actor, al Director le llegan la suya, la del Coordinador Pedagógico y la del
 * Jefe de Taller, todas de la misma institución.
 */
describe('mapIPlantillaToPlantilla — autor', () => {
  it('traslada el nombre del autor que resuelve el servidor', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ autorNombre: 'MARIA QUISPE HUANCA' }));
    expect(p.autorNombre).toBe('MARIA QUISPE HUANCA');
  });

  /** Las plantillas antiguas no traen el campo; la tarjeta muestra «—». */
  it('deja el nombre sin definir cuando el servidor no lo manda', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla());
    expect(p.autorNombre).toBeUndefined();
  });
});

/**
 * Rastro de las ediciones.
 *
 * Editar una plantilla toma uno de dos caminos (`plantilla.service.ts:121`): con
 * fichas asociadas se crea una versión nueva y la anterior queda Histórica; sin
 * fichas se pisa la misma fila. En ese segundo caso el único rastro es
 * `updatedAt`, que antes no llegaba al modelo.
 */
describe('mapIPlantillaToPlantilla — trazabilidad de la edición', () => {
  it('trae la fecha de actualización en el día que corresponde en Perú', () => {
    const p = mapIPlantillaToPlantilla(
      iPlantilla({ createdAt: '2026-03-09T12:00:00.000Z', updatedAt: '2026-03-11T01:00:00.000Z' }),
    );
    expect(p.fechaActualizacion).toBe('2026-03-10');
  });

  /** Sin `updatedAt` no se inventa una fecha: la tarjeta no muestra la fila. */
  it('sin updatedAt deja la fecha de actualización vacía', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ updatedAt: undefined }));
    expect(p.fechaActualizacion).toBe('');
  });

  it('trae el número de versión, que es el rastro cuando la edición versiona', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ version: 3 }));
    expect(p.version).toBe(3);
  });

  /** Las respuestas viejas no traían versión; la primera es la 1. */
  it('sin versión asume la primera', () => {
    const p = mapIPlantillaToPlantilla(iPlantilla({ version: undefined }));
    expect(p.version).toBe(1);
  });
});
