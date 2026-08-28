import { describe, it, expect } from 'vitest';
import {
  rubricasDeLaUgel,
  rubricasInstitucionales,
  type PlantillaAnalizable,
} from './rubricas-elegibles';

/**
 * Qué rúbricas propias puede analizar una institución.
 *
 * El defecto que trae estas pruebas: el filtro agrupaba por CARGO, dando por
 * hecho que cada cargo tenía a lo sumo una ficha. Desde que el cupo se aprueba a
 * nombre de una persona, una I.E. puede tener dos coordinadores pedagógicos con
 * una ficha cada uno —distintos criterios, distinta escala—, y las dos caían en
 * la misma píldora con el mismo rótulo.
 *
 * Elegir la rúbrica equivocada acá no da ningún aviso: sale un gráfico con
 * números que parecen buenos y describen otra cosa.
 */

const IE = 'ie-1';

const plantilla = (over: Partial<PlantillaAnalizable> = {}): PlantillaAnalizable => ({
  id: 'p-1',
  instrumento: 'DOCENTE',
  tipoMonitoreo: 'Monitoreo Docente',
  anioAcademico: 2026,
  ieId: IE,
  creadoPorRole: 'coordinador_pedagogico',
  autorNombre: 'ROSMINDA MAMANI HILASACA',
  ...over,
});

const conteos = (pares: Record<string, number>) => new Map(Object.entries(pares));

describe('rubricasInstitucionales', () => {
  it('rotula cada rúbrica con el nombre que le puso quien la creó', () => {
    const propia = plantilla({ id: 'a', descripcion: 'Ficha de aula CTA' });

    const { rubricas } = rubricasInstitucionales([propia], conteos({ a: 3 }));

    expect(rubricas).toHaveLength(1);
    expect(rubricas[0]?.label).toBe('Ficha de aula CTA');
    expect(rubricas[0]?.conteo).toBe(3);
  });

  /** El caso que trae la regla: dos personas del mismo cargo. */
  it('distingue dos fichas del mismo cargo por su nombre', () => {
    const deRosminda = plantilla({ id: 'a', descripcion: 'Ficha de aula CTA' });
    const deMonica = plantilla({
      id: 'b',
      descripcion: 'Ficha de comunicación',
      autorNombre: 'MONICA APAZA QUISPE',
    });

    const { rubricas } = rubricasInstitucionales([deRosminda, deMonica], conteos({ a: 2, b: 5 }));

    expect(rubricas.map((r) => r.label)).toEqual(['Ficha de comunicación', 'Ficha de aula CTA']);
  });

  it('agrega el autor cuando dos fichas se llaman igual', () => {
    // Sin esto quedarían dos botones idénticos que analizan cosas distintas.
    const deRosminda = plantilla({ id: 'a', descripcion: 'Ficha de aula' });
    const deMonica = plantilla({
      id: 'b',
      descripcion: 'Ficha de aula',
      autorNombre: 'MONICA APAZA QUISPE',
    });

    const { rubricas } = rubricasInstitucionales([deRosminda, deMonica], conteos({ a: 1, b: 1 }));

    expect(rubricas.map((r) => r.label).sort()).toEqual([
      'Ficha de aula · MONICA APAZA',
      'Ficha de aula · ROSMINDA MAMANI',
    ]);
  });

  it('no agrega el autor cuando los nombres ya distinguen', () => {
    const a = plantilla({ id: 'a', descripcion: 'Ficha de aula' });
    const b = plantilla({ id: 'b', descripcion: 'Ficha de taller' });

    const { rubricas } = rubricasInstitucionales([a, b], conteos({ a: 1, b: 1 }));

    expect(rubricas.every((r) => !r.label.includes('·'))).toBe(true);
  });

  it('una ficha sin nombre cae en su instrumento y año', () => {
    // Las creadas antes de que el formulario pidiera nombre.
    const vieja = plantilla({ id: 'a', descripcion: undefined });

    const { rubricas } = rubricasInstitucionales([vieja], conteos({ a: 1 }));

    expect(rubricas[0]?.label).toBe('Monitoreo Docente (2026)');
  });

  it('el detalle nombra a la persona, su cargo y el instrumento', () => {
    const propia = plantilla({ id: 'a', descripcion: 'Ficha de aula CTA' });

    const { rubricas } = rubricasInstitucionales([propia], conteos({ a: 1 }));

    expect(rubricas[0]?.titulo).toBe(
      'Ficha de aula CTA — ROSMINDA MAMANI · Coordinador Pedagógico · Ficha Docente',
    );
  });

  it('ordena por cantidad de fichas: es el orden en que se las busca', () => {
    const poca = plantilla({ id: 'a', descripcion: 'Poca' });
    const mucha = plantilla({ id: 'b', descripcion: 'Mucha' });

    const { rubricas } = rubricasInstitucionales([poca, mucha], conteos({ a: 1, b: 9 }));

    expect(rubricas.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('nunca ofrece las fichas de la UGEL: ésas tienen su propio grupo', () => {
    const deLaUgel = plantilla({ id: 'u', ieId: undefined, creadoPorRole: 'jefe_gestion' });

    const { rubricas } = rubricasInstitucionales([deLaUgel], conteos({ u: 10 }));

    expect(rubricas).toEqual([]);
  });

  describe('cuando no hay nada que analizar', () => {
    /**
     * Antes se mostraban tres píldoras en cero —Dirección, Coordinador P., Jefe
     * de Taller— aunque no existiera ninguna ficha propia. Eso prometía una
     * estructura que ya no existe: una I.E. puede pasar el año entero sin
     * ninguna ficha propia, y es lo normal.
     */
    it('sin fichas propias dice que no hay ninguna, y no inventa píldoras', () => {
      const soloUgel = plantilla({ id: 'u', ieId: undefined, creadoPorRole: 'jefe_gestion' });

      const { rubricas, motivoVacio } = rubricasInstitucionales([soloUgel], conteos({ u: 4 }));

      expect(rubricas).toEqual([]);
      expect(motivoVacio).toBe('SIN_PLANTILLAS');
    });

    /** Tener la ficha y no haberla usado todavía es otra cosa, y se dice distinto. */
    it('con fichas propias sin monitoreos lo distingue del caso anterior', () => {
      const propia = plantilla({ id: 'a', descripcion: 'Ficha de aula CTA' });

      const { rubricas, motivoVacio } = rubricasInstitucionales([propia], conteos({}));

      expect(rubricas).toEqual([]);
      expect(motivoVacio).toBe('SIN_FICHAS');
    });

    it('no ofrece una rúbrica que quedó fuera del ámbito filtrado', () => {
      // El conteo llega ya acotado por modalidad/nivel/institución: una rúbrica
      // sin fichas ahí se elegiría y el gráfico saldría vacío, sin decir por qué.
      const propia = plantilla({ id: 'a', descripcion: 'Ficha de aula CTA' });

      const { rubricas } = rubricasInstitucionales([propia], conteos({ a: 0 }));

      expect(rubricas).toEqual([]);
    });
  });
});

describe('rubricasDeLaUgel', () => {
  const INSTRUMENTOS = ['DOCENTE', 'DOCENTE_EIB', 'DIRECTIVO'] as const;

  const oficial = (over: Partial<PlantillaAnalizable> = {}): PlantillaAnalizable => ({
    id: 'u-1',
    instrumento: 'DOCENTE',
    tipoMonitoreo: 'Monitoreo Docente',
    anioAcademico: 2026,
    ieId: undefined,
    creadoPorRole: 'jefe_gestion',
    version: 1,
    estado: 'Vigente',
    ...over,
  });

  it('ofrece los tres instrumentos del catálogo oficial', () => {
    const rubricas = rubricasDeLaUgel([oficial()], conteos({ 'u-1': 4 }), INSTRUMENTOS);

    expect(rubricas.map((r) => r.label)).toEqual(['Docente', 'Docente EIB', 'Directivo']);
  });

  it('ofrece la vigente aunque no tenga fichas todavía', () => {
    // Es la que se va a usar en la próxima visita: su ausencia se leería como
    // que falta el instrumento.
    const rubricas = rubricasDeLaUgel([oficial()], conteos({}), ['DOCENTE']);

    expect(rubricas).toHaveLength(1);
    expect(rubricas[0]?.conteo).toBe(0);
  });

  /**
   * El defecto que trae estas pruebas. Versionar archiva la anterior y las
   * fichas ya levantadas se quedan en la vieja: la píldora apuntaba sólo a la
   * vigente y decía «Docente 0» mientras la pantalla analizaba una ficha de la
   * v1, que ni figuraba en la lista. Ninguna píldora quedaba resaltada.
   */
  it('ofrece también la versión anterior cuando conserva fichas', () => {
    const v1 = oficial({ id: 'v1', version: 1, estado: 'Historico' });
    const v2 = oficial({ id: 'v2', version: 2, estado: 'Vigente' });

    const rubricas = rubricasDeLaUgel([v1, v2], conteos({ v1: 1 }), ['DOCENTE']);

    expect(rubricas.map((r) => r.id)).toEqual(['v2', 'v1']);
    expect(rubricas.map((r) => r.label)).toEqual(['Docente · v2', 'Docente · v1']);
  });

  it('no suma las versiones: son rúbricas distintas', () => {
    // Versionar puede agregar, quitar o reescribir desempeños. Promediar
    // criterios que no son los mismos produce un número que no significa nada.
    const v1 = oficial({ id: 'v1', version: 1, estado: 'Historico' });
    const v2 = oficial({ id: 'v2', version: 2, estado: 'Vigente' });

    const rubricas = rubricasDeLaUgel([v1, v2], conteos({ v1: 7, v2: 3 }), ['DOCENTE']);

    expect(rubricas.map((r) => r.conteo)).toEqual([3, 7]);
  });

  it('sin versiones en juego el rótulo queda limpio', () => {
    const rubricas = rubricasDeLaUgel([oficial()], conteos({ 'u-1': 4 }), ['DOCENTE']);

    expect(rubricas[0]?.label).toBe('Docente');
  });

  it('una versión archivada sin fichas no se ofrece', () => {
    const v1 = oficial({ id: 'v1', version: 1, estado: 'Historico' });
    const v2 = oficial({ id: 'v2', version: 2, estado: 'Vigente' });

    const rubricas = rubricasDeLaUgel([v1, v2], conteos({ v2: 5 }), ['DOCENTE']);

    expect(rubricas.map((r) => r.id)).toEqual(['v2']);
  });

  it('nunca ofrece las fichas de una institución', () => {
    const deUnaIE = oficial({ id: 'ie', ieId: 'ie-1', creadoPorRole: 'director_ie' });

    const rubricas = rubricasDeLaUgel([deUnaIE], conteos({ ie: 9 }), ['DOCENTE']);

    expect(rubricas[0]?.conteo).toBe(0);
  });
});
