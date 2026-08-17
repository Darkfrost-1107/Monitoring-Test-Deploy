import { describe, it, expect } from 'vitest';
import { nivelesPorDefecto } from './escala-por-defecto';
import { esEscalaCualitativa, nivelesValorables, resumirPorNivel } from './resumen-cualitativo';
import type { NivelCalificacion } from './model';

/**
 * Pruebas del resumen de frecuencias de un instrumento cualitativo.
 *
 * El conteo vivía duplicado dentro de dos componentes —`ConsolidadoSeccion` y
 * el `Consolidado` de `CierreDeLaFicha`— y clasificaba por substring:
 *
 *     if (denom.includes('sí') || denom.includes('si')) countSi++;
 *     else if (denom.includes('parcial')) countParcial++;
 *     else if (denom.includes('no')) countNo++;
 *
 * Un ítem sin marcar no caía en ninguna de las tres ramas y se perdía de los
 * contadores, mientras la fila TOTAL del documento impreso seguía escribiendo
 * 100% a mano. Las dos copias además diferían en el respaldo de una denominación
 * ausente —`''` en una, `Nivel ${romano}` en la otra— así que contaban distinto
 * sobre los mismos datos.
 *
 * De ahí que el resumen cuente contra los niveles que la plantilla declara y
 * mande lo no valorado a su propio casillero, para que las cantidades siempre
 * cuadren con el total.
 *
 * La escala EIB se declara con un cuarto nivel de relleno —«Destacado»— que el
 * instrumento no puede otorgar; ver `nivelesValorables`.
 */

const ESCALA_EIB = nivelesPorDefecto('Monitoreo Docente EIB');
const ESCALA_DOCENTE = nivelesPorDefecto('Monitoreo Docente');
const ESCALA_DIRECTIVO = nivelesPorDefecto('Monitoreo Directivo');

/** Cómo quedó guardada una plantilla EIB creada antes de retirar el relleno. */
const ESCALA_EIB_HEREDADA: NivelCalificacion[] = [
  ...ESCALA_EIB,
  { nivel: 'IV', denominacion: 'Destacado', rangoMin: 100, color: '#3b82f6' },
];

describe('esEscalaCualitativa', () => {
  it('reconoce la escala EIB por sus denominaciones Sí / Parcialmente / No', () => {
    expect(esEscalaCualitativa(ESCALA_EIB)).toBe(true);
  });

  /**
   * El respaldo que había —`desempenos.length > 10`— no hacía falta para la EIB
   * y volvía cualitativa a cualquier plantilla docente con once desempeños.
   * Las plantillas las arma el usuario: el umbral se disparaba solo.
   */
  it('no confunde la escala docente, que se califica con puntaje', () => {
    expect(esEscalaCualitativa(ESCALA_DOCENTE)).toBe(false);
  });

  it('no confunde la escala directiva', () => {
    expect(esEscalaCualitativa(ESCALA_DIRECTIVO)).toBe(false);
  });

  it('tolera una escala vacía', () => {
    expect(esEscalaCualitativa([])).toBe(false);
  });
});

/**
 * La escala EIB ya se declara con sus tres valoraciones, pero las plantillas
 * creadas antes están persistidas con un cuarto nivel de relleno —«Destacado»—.
 * Este filtro es lo que evita que ese nivel heredado aparezca en el consolidado
 * con 0 ítems, en pantalla y en el PDF oficial, sin migrar la base de datos.
 */
describe('nivelesValorables', () => {
  it('deja pasar las tres valoraciones de la escala EIB vigente', () => {
    expect(nivelesValorables(ESCALA_EIB).map((n) => n.denominacion)).toEqual([
      'No',
      'Parcialmente',
      'Sí',
    ]);
  });

  it('descarta el cuarto nivel de una plantilla EIB ya guardada', () => {
    expect(nivelesValorables(ESCALA_EIB_HEREDADA).map((n) => n.denominacion)).toEqual([
      'No',
      'Parcialmente',
      'Sí',
    ]);
  });
});

describe('resumirPorNivel', () => {
  it('cuenta cada ítem contra el nivel que se le marcó', () => {
    const resumen = resumirPorNivel(['a', 'b', 'c', 'd'], ESCALA_EIB, {
      a: 'III',
      b: 'III',
      c: 'II',
      d: 'I',
    });

    expect(resumen.total).toBe(4);
    expect(resumen.porNivel.map((n) => [n.denominacion, n.cantidad])).toEqual([
      ['No', 1],
      ['Parcialmente', 1],
      ['Sí', 2],
    ]);
    expect(resumen.sinValorar.cantidad).toBe(0);
  });

  /**
   * La regresión que este filtro evita sobre una plantilla ya guardada:
   * informar «Destacado — 0 · 0%» en la pantalla y en el PDF oficial, un nivel
   * que nadie puede marcar.
   */
  it('no informa una columna para el nivel heredado de relleno', () => {
    const resumen = resumirPorNivel(['a', 'b'], ESCALA_EIB_HEREDADA, { a: 'III', b: 'I' });

    expect(resumen.porNivel).toHaveLength(3);
    expect(resumen.porNivel.some((n) => n.denominacion === 'Destacado')).toBe(false);
  });

  /**
   * Defensivo: el nivel IV es inalcanzable desde la ficha EIB, pero una ficha
   * vieja podría traer la marca. No debe contarse como valoración ni desaparecer.
   */
  it('trata una marca en el nivel heredado como sin valorar', () => {
    const resumen = resumirPorNivel(['a'], ESCALA_EIB_HEREDADA, { a: 'IV' });

    expect(resumen.sinValorar.cantidad).toBe(1);
    expect(resumen.porNivel.every((n) => n.cantidad === 0)).toBe(true);
  });

  it('lleva lo no marcado a su propio casillero', () => {
    const resumen = resumirPorNivel(['a', 'b', 'c'], ESCALA_EIB, { a: 'III' });

    expect(resumen.sinValorar.cantidad).toBe(2);
    expect(resumen.porNivel.find((n) => n.denominacion === 'Sí')?.cantidad).toBe(1);
  });

  /**
   * La invariante que la fila TOTAL del documento impreso daba por supuesta con
   * un 100% escrito a mano.
   */
  it('reparte todos los ítems: los conteos suman el total', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const resumen = resumirPorNivel(ids, ESCALA_EIB, { a: 'I', b: 'II', c: 'III', d: 'IV' });

    const contados =
      resumen.porNivel.reduce((suma, n) => suma + n.cantidad, 0) + resumen.sinValorar.cantidad;

    expect(contados).toBe(resumen.total);
  });

  it('ignora un nivel marcado que la escala no declara', () => {
    const resumen = resumirPorNivel(['a'], ESCALA_EIB, { a: 'IX' });

    expect(resumen.porNivel.every((n) => n.cantidad === 0)).toBe(true);
    expect(resumen.sinValorar.cantidad).toBe(1);
  });

  it('calcula el porcentaje sobre el total de ítems', () => {
    const resumen = resumirPorNivel(['a', 'b', 'c', 'd'], ESCALA_EIB, {
      a: 'III',
      b: 'III',
      c: 'III',
      d: 'I',
    });

    expect(resumen.porNivel.find((n) => n.denominacion === 'Sí')?.porcentaje).toBe(75);
    expect(resumen.porNivel.find((n) => n.denominacion === 'No')?.porcentaje).toBe(25);
  });

  it('no divide por cero cuando no hay ítems', () => {
    const resumen = resumirPorNivel([], ESCALA_EIB, {});

    expect(resumen.total).toBe(0);
    expect(resumen.porNivel.every((n) => n.porcentaje === 0)).toBe(true);
    expect(resumen.sinValorar.porcentaje).toBe(0);
  });

  it('conserva el color que declara la plantilla, sin inventar uno', () => {
    const resumen = resumirPorNivel(['a'], ESCALA_EIB, { a: 'III' });

    expect(resumen.porNivel.map((n) => n.color)).toEqual(
      nivelesValorables(ESCALA_EIB).map((n) => n.color),
    );
  });
});
