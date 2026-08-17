import { describe, it, expect } from 'vitest';
import {
  baremoPorDefecto,
  cantidadDeValoraciones,
  descriptorPorDefecto,
  nivelesPorDefecto,
  normalizarEscala,
  romanosDeInstrumento,
} from './escala-por-defecto';
import type { NivelCalificacion } from './model';

/**
 * Pruebas de la escala que se propone al registrar una plantilla.
 *
 * Hasta ahora se proponía una sola —0/11/15/18, «Muy Insatisfactorio / En
 * Proceso / Satisfactorio / Destacado»— que no coincide con ninguna de las dos
 * rúbricas oficiales de la UGEL Lampa. Nadie lo notó porque el motor ignoraba
 * `rangoMin` y decidía con umbrales fijos.
 *
 * Ahora el motor honra esos números: la escala propuesta ES la que va a
 * clasificar las fichas, de modo que tiene que salir del documento correcto.
 */

/**
 * FICHA DOCENTE EIB — lista de cotejo de TRES valores: No, Parcialmente, Sí.
 *
 * ── Qué cambió ──
 * La escala llevaba un cuarto nivel inventado, «Destacado», con el mismo
 * `rangoMin` que «Sí». No salía del instrumento: existía porque cinco
 * validaciones exigían cuatro niveles —el zod del formulario, los dos DTO y las
 * dos reglas de `validarReglas`— y sin él la plantilla EIB no se podía guardar.
 *
 * Nunca fue visible ni editable: el editor de escala para EIB muestra tres filas
 * y `getOpcionesEib` ofrece tres botones. Después había que filtrarlo en cada
 * consolidado para que no apareciera con 0 ítems.
 *
 * Hoy la cantidad la declara `VALORACIONES_POR_TIPO` en el contrato compartido y
 * las cinco validaciones la consultan.
 */
describe('nivelesPorDefecto — Monitoreo Docente EIB', () => {
  const escala = nivelesPorDefecto('Monitoreo Docente EIB');

  it('propone las tres valoraciones de la lista de cotejo', () => {
    expect(escala.map((n) => n.denominacion)).toEqual(['No', 'Parcialmente', 'Sí']);
  });

  it('no lleva un cuarto nivel', () => {
    expect(escala).toHaveLength(3);
    expect(escala.some((n) => n.denominacion === 'Destacado')).toBe(false);
  });

  it('se resuelve por porcentaje, no por puntaje', () => {
    expect(baremoPorDefecto('Monitoreo Docente EIB')).toBe('Porcentual');
  });
});

describe('cantidadDeValoraciones', () => {
  it('da tres para la lista de cotejo EIB', () => {
    expect(cantidadDeValoraciones('Monitoreo Docente EIB')).toBe(3);
  });

  it('da cuatro para los instrumentos que puntúan', () => {
    expect(cantidadDeValoraciones('Monitoreo Docente')).toBe(4);
    expect(cantidadDeValoraciones('Monitoreo Directivo')).toBe(4);
  });
});

describe('romanosDeInstrumento', () => {
  it('la EIB no otorga el nivel IV', () => {
    expect(romanosDeInstrumento('Monitoreo Docente EIB')).toEqual(['I', 'II', 'III']);
  });

  it('los instrumentos que puntúan otorgan de I a IV', () => {
    expect(romanosDeInstrumento('Monitoreo Docente')).toEqual(['I', 'II', 'III', 'IV']);
  });
});

/**
 * La escala EIB de las plantillas creadas antes de este cambio está persistida
 * con cuatro niveles. Se normaliza al leerla, y por eso no hace falta migrar la
 * base de datos.
 */
describe('normalizarEscala', () => {
  const ESCALA_EIB_HEREDADA: NivelCalificacion[] = [
    { nivel: 'I', denominacion: 'No', rangoMin: 0, color: '#ef4444' },
    { nivel: 'II', denominacion: 'Parcialmente', rangoMin: 50, color: '#f59e0b' },
    { nivel: 'III', denominacion: 'Sí', rangoMin: 100, color: '#22c55e' },
    { nivel: 'IV', denominacion: 'Destacado', rangoMin: 100, color: '#3b82f6' },
  ];

  it('recorta el cuarto nivel de una plantilla EIB ya guardada', () => {
    const escala = normalizarEscala(ESCALA_EIB_HEREDADA, 'Monitoreo Docente EIB');

    expect(escala.map((n) => n.denominacion)).toEqual(['No', 'Parcialmente', 'Sí']);
  });

  it('conserva las denominaciones que el usuario editó', () => {
    const editada = ESCALA_EIB_HEREDADA.map((n) =>
      n.nivel === 'II' ? { ...n, denominacion: 'En proceso' } : n,
    );

    expect(normalizarEscala(editada, 'Monitoreo Docente EIB')[1].denominacion).toBe('En proceso');
  });

  it('deja intacta una escala de cuatro de un instrumento que puntúa', () => {
    const docente = nivelesPorDefecto('Monitoreo Docente');

    expect(normalizarEscala(docente, 'Monitoreo Docente')).toEqual(docente);
  });

  it('cae en la propuesta por defecto si falta un nivel esperado', () => {
    const incompleta = nivelesPorDefecto('Monitoreo Docente').slice(0, 2);

    expect(normalizarEscala(incompleta, 'Monitoreo Docente')).toHaveLength(4);
  });

  it('tolera una escala ausente', () => {
    expect(normalizarEscala(undefined, 'Monitoreo Docente EIB')).toHaveLength(3);
  });
});

describe('descriptorPorDefecto', () => {
  it('en la EIB el respaldo es la valoración misma', () => {
    expect(descriptorPorDefecto('Monitoreo Docente EIB', 'I')).toBe('No');
    expect(descriptorPorDefecto('Monitoreo Docente EIB', 'II')).toBe('Parcialmente');
    expect(descriptorPorDefecto('Monitoreo Docente EIB', 'III')).toBe('Sí');
  });

  it('en los instrumentos que puntúan se rotula con el nivel', () => {
    expect(descriptorPorDefecto('Monitoreo Docente', 'IV')).toBe('Nivel IV');
  });
});

describe('nivelesPorDefecto — Monitoreo Docente', () => {
  const escala = nivelesPorDefecto('Monitoreo Docente');

  /**
   * FICHA Y RÚBRICA DE MONITOREO AL DOCENTE 2025 — se resuelve por porcentaje.
   *
   * Su consolidado puntúa siete columnas: D1 a D5 más R6 y R7, los ejes e items.
   * La columna TOTAL de la leyenda está calculada sobre cinco. La columna
   * PROMEDIO —1-1,4 / 1,6-2,4 / 2,6-3,4 / 3,6-4— es la regla operativa, y sobre
   * el nivel máximo de 4 da estos porcentajes.
   */
  it('propone los cortes en puntaje de la rúbrica docente', () => {
    expect(escala.map((n) => n.rangoMin)).toEqual([5, 8, 13, 18]);
  });

  it('propone los nombres de la rúbrica docente', () => {
    expect(escala.map((n) => n.denominacion)).toEqual([
      'Inicio',
      'En proceso',
      'Logro esperado',
      'Logro destacado',
    ]);
  });

});

describe('nivelesPorDefecto — Monitoreo Directivo', () => {
  const escala = nivelesPorDefecto('Monitoreo Directivo');

  /**
   * FICHA Y RÚBRICA DE MONITOREO DIRECTIVO 2025 — se resuelve por porcentaje.
   *
   * Su consolidado lleva una fila «% DE AVANCE» y su baremo rotula cada tramo
   * con 25 · 50 · 75 · 100. Los rangos absolutos que también lista (00-08,
   * 09-16, 17-20, 21-24) están calculados sobre 24 puntos —seis rúbricas de
   * cuatro niveles— y la ficha vigente tiene cinco.
   */
  it('propone los cortes porcentuales de la rúbrica directiva', () => {
    expect(escala.map((n) => n.rangoMin)).toEqual([25, 50, 75, 100]);
  });

  /**
   * Se proponen los nombres del baremo consolidado, que son los que distinguen
   * a este instrumento. Los de la tabla «NIVELES DEL LOGRO» —Inicio, En
   * Proceso, Logro Esperado, Logro Destacado— son idénticos a los del docente y
   * dejaban las dos plantillas indistinguibles en pantalla.
   */
  it('propone los nombres que distinguen a la rúbrica directiva', () => {
    expect(escala.map((n) => n.denominacion)).toEqual([
      'En inicio',
      'En proceso',
      'Logrado',
      'Satisfactorio',
    ]);
  });


  /**
   * El nivel más alto tiene que ser alcanzable.
   *
   * Con las cinco rúbricas de la ficha vigente, marcarlas todas en IV da 20
   * sobre 20: cien por ciento de avance. Leído sobre el puntaje crudo con los
   * rangos absolutos del documento —cuyo tramo superior arranca en 21— ese
   * mismo resultado perfecto se quedaba en «Logrado».
   */
  it('el nivel más alto se alcanza marcando todas las rúbricas en IV', () => {
    const RUBRICAS_DE_LA_FICHA = 5;
    const NIVEL_MAXIMO = 4;
    const avanceMaximo =
      ((RUBRICAS_DE_LA_FICHA * NIVEL_MAXIMO) / (RUBRICAS_DE_LA_FICHA * NIVEL_MAXIMO)) * 100;

    expect(escala[3].rangoMin).toBeLessThanOrEqual(avanceMaximo);
  });
});

describe('baremoPorDefecto', () => {
  /**
   * Las dos rúbricas oficiales cortan sobre el porcentaje. Los rangos absolutos
   * de ambos documentos están calculados sobre una cantidad de filas que ya no
   * es la vigente —cinco en el docente, que puntúa siete; seis en el directivo,
   * que puntúa cinco— y el porcentaje no depende de eso.
   */
  it('la rúbrica docente se califica con puntaje', () => {
    expect(baremoPorDefecto('Monitoreo Docente')).toBe('Vigente');
  });

  it('la rúbrica directiva se resuelve por porcentaje de avance', () => {
    expect(baremoPorDefecto('Monitoreo Directivo')).toBe('Porcentual');
  });
});

describe('nivelesPorDefecto — lo común a las dos', () => {
  it.each([['Monitoreo Docente'], ['Monitoreo Directivo']])(
    '%s propone los cuatro niveles en orden romano',
    (tipo) => {
      expect(nivelesPorDefecto(tipo).map((n) => n.nivel)).toEqual(['I', 'II', 'III', 'IV']);
    },
  );

  it.each([['Monitoreo Docente'], ['Monitoreo Directivo']])(
    '%s propone los rangos en orden ascendente',
    (tipo) => {
      const rangos = nivelesPorDefecto(tipo).map((n) => n.rangoMin);
      expect([...rangos].sort((a, b) => a - b)).toEqual(rangos);
    },
  );

  /**
   * Un tipo desconocido cae en la rúbrica docente, que es la de uso corriente.
   * Devolver una lista vacía dejaría la plantilla sin escala y el cálculo
   * volvería a los umbrales fijos sin que nadie se entere.
   */
  it('un tipo desconocido cae en la escala docente', () => {
    expect(nivelesPorDefecto('Otra cosa')).toEqual(nivelesPorDefecto('Monitoreo Docente'));
  });

  it('devuelve una copia: modificarla no contamina la siguiente plantilla', () => {
    const primera = nivelesPorDefecto('Monitoreo Docente');
    primera[0].rangoMin = 99;

    expect(nivelesPorDefecto('Monitoreo Docente')[0].rangoMin).toBe(5);
  });
});
