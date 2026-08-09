import {
  calcularResultadoBaremo,
  nivelPorEscala,
  type TramoDeEscala,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Pruebas de la escala declarada por la plantilla.
 *
 * El baremo estaba fijo en código: cuatro umbrales sobre el promedio, con
 * mínimo 1 y máximo 4. Eso reproduce la rúbrica DOCENTE de la UGEL Lampa, pero
 * la DIRECTIVA no entra en ese molde —empieza en 0, llega a 24, se decide sobre
 * el total y usa otros nombres—.
 *
 * Mientras tanto la plantilla ya declaraba su escala: `rangoMin` y
 * `denominacion` por nivel, capturados en la pantalla de registro y guardados en
 * la base. El motor los ignoraba. Ahora los usa.
 */

/** Rúbrica de monitoreo al DOCENTE 2025 — UGEL Lampa. Corta sobre el puntaje, 0–20. */
const ESCALA_DOCENTE: TramoDeEscala[] = [
  { nivelRomano: 'I', rangoMin: 5, denominacion: 'Inicio' },
  { nivelRomano: 'II', rangoMin: 8, denominacion: 'En proceso' },
  { nivelRomano: 'III', rangoMin: 13, denominacion: 'Logro esperado' },
  { nivelRomano: 'IV', rangoMin: 18, denominacion: 'Logro destacado' },
];

/** Rúbrica de monitoreo DIRECTIVO 2025. Corta sobre el porcentaje de avance. */
const ESCALA_DIRECTIVO: TramoDeEscala[] = [
  { nivelRomano: 'I', rangoMin: 25, denominacion: 'En inicio' },
  { nivelRomano: 'II', rangoMin: 50, denominacion: 'En proceso' },
  { nivelRomano: 'III', rangoMin: 75, denominacion: 'Logrado' },
  { nivelRomano: 'IV', rangoMin: 100, denominacion: 'Satisfactorio' },
];

describe('nivelPorEscala', () => {
  /** Los bordes que da la leyenda del documento, en puntaje. */
  describe('rúbrica docente — los bordes de la leyenda', () => {
    it.each([
      [5, 'Inicio'],
      [7, 'Inicio'],
      [8, 'En proceso'],
      [12, 'En proceso'],
      [13, 'Logro esperado'],
      [17, 'Logro esperado'],
      [18, 'Logro destacado'],
      [20, 'Logro destacado'],
    ])('total %i cae en %s', (total, denominacion) => {
      expect(nivelPorEscala(total, ESCALA_DOCENTE)?.denominacion).toBe(denominacion);
    });
  });

  describe('rúbrica directiva — los bordes de cada tramo, en porcentaje', () => {
    it.each([
      [25, 'En inicio'],
      [49, 'En inicio'],
      [50, 'En proceso'],
      [74, 'En proceso'],
      [75, 'Logrado'],
      [99, 'Logrado'],
      [100, 'Satisfactorio'],
    ])('%i%% de avance cae en %s', (avance, denominacion) => {
      expect(nivelPorEscala(avance, ESCALA_DIRECTIVO)?.denominacion).toBe(denominacion);
    });
  });

  /**
   * El cero es un valor legítimo. El baremo anterior lanzaba excepción por
   * debajo de promedio 1, de modo que el tramo más bajo hacía fallar el cálculo.
   */
  it('acepta el cero sin fallar', () => {
    expect(() => nivelPorEscala(0, ESCALA_DIRECTIVO)).not.toThrow();
    expect(nivelPorEscala(0, ESCALA_DIRECTIVO)?.nivelRomano).toBe('I');
  });

  it('ordena la escala por rango, no confía en el orden recibido', () => {
    const desordenada = [...ESCALA_DIRECTIVO].reverse();
    expect(nivelPorEscala(75, desordenada)?.denominacion).toBe('Logrado');
  });

  it('sin escala declarada no decide nada', () => {
    expect(nivelPorEscala(12, [])).toBeNull();
  });

  /** Un total por debajo del primer tramo cae en el primero, no en ninguno. */
  it('un total menor que el rango mínimo más bajo cae en el tramo inicial', () => {
    const sinCero: TramoDeEscala[] = [
      { nivelRomano: 'I', rangoMin: 5, denominacion: 'Inicio' },
      { nivelRomano: 'II', rangoMin: 8, denominacion: 'En proceso' },
    ];
    expect(nivelPorEscala(3, sinCero)?.denominacion).toBe('Inicio');
  });
});

describe('calcularResultadoBaremo con escala de plantilla', () => {
  it('decide sobre el puntaje y devuelve la denominación de la plantilla', () => {
    // Cinco desempeños que suman 17.
    const resultado = calcularResultadoBaremo([4, 4, 3, 3, 3], ESCALA_DOCENTE, 'Vigente');

    expect(resultado.puntajeTotal).toBe(17);
    expect(resultado.nivelLogro).toBe('LOGRO_ESPERADO');
    expect(resultado.denominacion).toBe('Logro esperado');
  });

  /**
   * Los cortes por puntaje se calibran contra un techo concreto: los de la
   * leyenda docente valen para los cinco desempeños que dan un máximo de 20.
   *
   * Una plantilla con siete desempeños llega a 28, y entonces siete niveles III
   * suman 21 y cruzan el corte de 18 pese a promediar 3,0. No es un defecto del
   * cálculo sino de la calibración: al cambiar la cantidad hay que ajustar los
   * cortes en la pantalla de registro, que es para lo que son editables.
   */
  it('los cortes por puntaje quedan calibrados al techo de la plantilla', () => {
    const resultado = calcularResultadoBaremo([3, 3, 3, 3, 3, 3, 3], ESCALA_DOCENTE, 'Vigente');

    expect(resultado.puntajeTotal).toBe(21);
    expect(resultado.promedio).toBe(3);
    expect(resultado.denominacion).toBe('Logro destacado');
  });

  it('clasifica una ficha directiva en el tramo más bajo sin fallar', () => {
    // Cinco rúbricas en nivel I: 5 de 20, el 25% de avance.
    const resultado = calcularResultadoBaremo([1, 1, 1, 1, 1], ESCALA_DIRECTIVO, 'Porcentual');

    expect(resultado.porcentaje).toBe(25);
    expect(resultado.nivelLogro).toBe('INICIO');
    expect(resultado.denominacion).toBe('En inicio');
  });

  /**
   * El nivel más alto de la rúbrica directiva tiene que ser alcanzable.
   *
   * Leída sobre el puntaje crudo, con el tramo superior del documento que
   * arranca en 21, una ficha perfecta —20 sobre 20— se quedaba en «Logrado».
   * Esos rangos absolutos están calculados sobre 24 puntos, que son seis
   * rúbricas; la ficha vigente tiene cinco.
   */
  it('cinco rúbricas en nivel IV alcanzan el tramo más alto', () => {
    const resultado = calcularResultadoBaremo([4, 4, 4, 4, 4], ESCALA_DIRECTIVO, 'Porcentual');

    expect(resultado.porcentaje).toBe(100);
    expect(resultado.denominacion).toBe('Satisfactorio');
  });

  /**
   * Las dos rúbricas dan niveles distintos para el mismo puntaje: es
   * exactamente lo que el baremo fijo no podía representar.
   */
  it('el mismo puntaje cae en niveles distintos según la rúbrica', () => {
    const niveles = [4, 4, 4, 3, 3]; // 18 de 20, el 90% de avance

    expect(calcularResultadoBaremo(niveles, ESCALA_DOCENTE, 'Vigente').denominacion).toBe(
      'Logro destacado',
    );
    expect(calcularResultadoBaremo(niveles, ESCALA_DIRECTIVO, 'Porcentual').denominacion).toBe(
      'Logrado',
    );
  });

  /**
   * El modo decide qué número se compara. Con la escala porcentual leída como
   * si fueran puntajes, una ficha de 18 puntos no alcanzaría ni el segundo
   * tramo: por eso el `baremo` de la plantilla tiene que viajar hasta acá.
   */
  it('leer una escala porcentual como puntaje da otro nivel', () => {
    const niveles = [4, 4, 4, 3, 3];

    expect(calcularResultadoBaremo(niveles, ESCALA_DIRECTIVO, 'Vigente').denominacion).toBe(
      'En inicio',
    );
  });

  /**
   * Sin escala se conserva el comportamiento anterior —umbrales sobre el
   * promedio— para que una plantilla sin niveles cargados siga clasificando.
   */
  it('sin escala vuelve a los umbrales sobre el promedio', () => {
    const resultado = calcularResultadoBaremo([4, 4, 4, 3, 3]);

    expect(resultado.nivelLogro).toBe('LOGRO_DESTACADO');
    expect(resultado.denominacion).toBe('Logro destacado');
  });
});
