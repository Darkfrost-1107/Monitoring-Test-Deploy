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
