import { describe, it, expect } from 'vitest';
import {
  NIVELES_SATISFACTORIOS,
  calcularEstadisticas,
  type ReporteMedible,
} from './estadisticas-reportes';

/**
 * Pruebas de las estadísticas del panel de reportes.
 *
 * Fase 6 de PLAN_REMEDIACION.md. La tarjeta «Nivel Satisfactorio» se calculaba
 * leyendo el borrador de la ficha desde `localStorage` y, cuando no estaba
 * —que es el caso normal, porque el borrador vive en el navegador de quien
 * llenó la ficha— caía a un relleno inventado con todos los niveles en III y
 * IV. El comentario del código lo llamaba «mock pre-filled state».
 *
 * Como ese relleno contaba como alto, cada ficha no cacheada aportaba 100 %: la
 * métrica tendía a 100 y no describía nada real. Ahora se calcula con
 * `nivelLogro`, que ya venía del backend en cada ficha completada.
 */

const reporte = (over: Partial<ReporteMedible> = {}): ReporteMedible => ({
  instrumento: 'DOCENTE',
  ...over,
});

describe('NIVELES_SATISFACTORIOS', () => {
  /**
   * Según el baremo del contrato compartido, un promedio superior a 2,5 sobre 4
   * corresponde a logro esperado o destacado. Ésos son los satisfactorios.
   */
  it('son logro esperado y logro destacado', () => {
    expect([...NIVELES_SATISFACTORIOS].sort()).toEqual(['LOGRO_DESTACADO', 'LOGRO_ESPERADO']);
  });
});

describe('calcularEstadisticas — conteos', () => {
  it('cuenta las fichas y las separa por tipo de monitoreo', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE' }),
      reporte({ instrumento: 'DOCENTE' }),
      reporte({ instrumento: 'DIRECTIVO' }),
    ]);

    expect(stats.fichas).toBe(3);
    expect(stats.fichasDocentes).toBe(2);
    expect(stats.fichasDirectivas).toBe(1);
  });

  it('devuelve ceros con la lista vacía', () => {
    const stats = calcularEstadisticas([]);

    expect(stats.fichas).toBe(0);
    expect(stats.fichasDocentes).toBe(0);
    expect(stats.fichasDirectivas).toBe(0);
    expect(stats.visitasMonitoreadas).toBe(0);
  });

  it('cuenta la ficha EIB como ficha docente', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE' }),
      reporte({ instrumento: 'DOCENTE_EIB' }),
    ]);

    expect(stats.fichasDocentes).toBe(2);
  });
});

/**
 * ── Por qué las visitas se cuentan aparte de las fichas ──
 * Hasta que se sumó la Ficha Docente EIB, un monitoreo programado daba
 * exactamente una ficha: un solo número servía para «cuántos monitoreos se
 * hicieron» y «cuántas fichas se llenaron». Hoy una visita docente puede llevar
 * la ficha regular Y la EIB, de modo que los dos números se separan.
 *
 * `fichas` cuenta filas. `visitasMonitoreadas` cuenta cronogramas distintos: una
 * visita con dos instrumentos sigue siendo UN monitoreo ejecutado, y contarla
 * dos veces informaría más monitoreos de los que se hicieron.
 */
describe('calcularEstadisticas — visitas frente a fichas', () => {
  it('una visita con dos instrumentos son dos fichas y un solo monitoreo', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE', cronogramaId: 'visita-1' }),
      reporte({ instrumento: 'DOCENTE_EIB', cronogramaId: 'visita-1' }),
    ]);

    expect(stats.fichas).toBe(2);
    expect(stats.visitasMonitoreadas).toBe(1);
  });

  it('dos visitas distintas cuentan dos monitoreos', () => {
    const stats = calcularEstadisticas([
      reporte({ cronogramaId: 'visita-1' }),
      reporte({ cronogramaId: 'visita-2' }),
    ]);

    expect(stats.visitasMonitoreadas).toBe(2);
  });

  /** Sin el identificador no se puede agrupar: cada ficha cuenta como su visita. */
  it('cuenta la ficha como su propia visita si no trae cronograma', () => {
    const stats = calcularEstadisticas([reporte({}), reporte({})]);

    expect(stats.visitasMonitoreadas).toBe(2);
  });

  it('no mezcla las que traen identificador con las que no', () => {
    const stats = calcularEstadisticas([
      reporte({ cronogramaId: 'visita-1' }),
      reporte({ cronogramaId: 'visita-1' }),
      reporte({}),
    ]);

    expect(stats.fichas).toBe(3);
    expect(stats.visitasMonitoreadas).toBe(2);
  });
});

/**
 * ── Por qué no hay un promedio único cuando se mezclan instrumentos ──
 * Las tres escalas tienen máximos distintos: la rúbrica docente llega a 4, la
 * lista de cotejo EIB a 3 —marca I, II o III— y la directiva se resuelve por
 * porcentaje. Promediarlas entre sí no da un número impreciso: no da ningún
 * número. Se informa por instrumento, y el promedio único queda nulo.
 */
describe('calcularEstadisticas — escalas no comparables', () => {
  it('no promedia entre instrumentos distintos', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE', promedio: 3.5, nivelLogro: 'LOGRO_ESPERADO' }),
      reporte({ instrumento: 'DOCENTE_EIB', promedio: 2.8, nivelLogro: 'LOGRO_ESPERADO' }),
    ]);

    expect(stats.promedioGeneral).toBeNull();
    expect(stats.satisfactionPercent).toBeNull();
  });

  it('sí promedia cuando todas las fichas son del mismo instrumento', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE', promedio: 3.0 }),
      reporte({ instrumento: 'DOCENTE', promedio: 4.0 }),
    ]);

    expect(stats.promedioGeneral).toBe(3.5);
  });

  it('desglosa cada instrumento por separado', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE', promedio: 3.0, nivelLogro: 'LOGRO_ESPERADO' }),
      reporte({ instrumento: 'DOCENTE', promedio: 4.0, nivelLogro: 'INICIO' }),
      reporte({ instrumento: 'DOCENTE_EIB', promedio: 2.0, nivelLogro: 'LOGRO_ESPERADO' }),
    ]);

    // El EIB es informativo: cuenta sus fichas pero no reporta nota ni nivel.
    expect(stats.porInstrumento).toEqual([
      { tipo: 'DOCENTE', fichas: 2, promedioGeneral: 3.5, satisfactionPercent: 50 },
      { tipo: 'DOCENTE_EIB', fichas: 1, promedioGeneral: null, satisfactionPercent: null },
    ]);
  });

  it('no lista un instrumento sin fichas', () => {
    const stats = calcularEstadisticas([reporte({ instrumento: 'DIRECTIVO' })]);

    expect(stats.porInstrumento.map((i) => i.tipo)).toEqual(['DIRECTIVO']);
  });

  it('con un solo instrumento el desglose coincide con el total', () => {
    const stats = calcularEstadisticas([
      reporte({ instrumento: 'DOCENTE', promedio: 3.0 }),
      reporte({ instrumento: 'DOCENTE', promedio: 4.0 }),
    ]);

    expect(stats.porInstrumento[0].promedioGeneral).toBe(stats.promedioGeneral);
  });
});

describe('calcularEstadisticas — nivel satisfactorio', () => {
  it('es el porcentaje de fichas en logro esperado o destacado', () => {
    const stats = calcularEstadisticas([
      reporte({ nivelLogro: 'LOGRO_ESPERADO' }),
      reporte({ nivelLogro: 'LOGRO_DESTACADO' }),
      reporte({ nivelLogro: 'EN_PROCESO' }),
      reporte({ nivelLogro: 'INICIO' }),
    ]);

    expect(stats.satisfactionPercent).toBe(50);
  });

  it('es 100 cuando todas alcanzaron el logro', () => {
    const stats = calcularEstadisticas([
      reporte({ nivelLogro: 'LOGRO_ESPERADO' }),
      reporte({ nivelLogro: 'LOGRO_DESTACADO' }),
    ]);

    expect(stats.satisfactionPercent).toBe(100);
  });

  it('es 0 cuando ninguna lo alcanzó', () => {
    expect(calcularEstadisticas([reporte({ nivelLogro: 'INICIO' })]).satisfactionPercent).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    const stats = calcularEstadisticas([
      reporte({ nivelLogro: 'LOGRO_ESPERADO' }),
      reporte({ nivelLogro: 'INICIO' }),
      reporte({ nivelLogro: 'INICIO' }),
    ]);

    expect(stats.satisfactionPercent).toBe(33);
  });

  /**
   * Las fichas sin nivel de logro no se cuentan en ninguno de los dos lados:
   * incluirlas como no satisfactorias castigaría por un dato ausente, y como
   * satisfactorias es justamente el defecto que esto corrige.
   */
  it('ignora las fichas sin nivel de logro', () => {
    const stats = calcularEstadisticas([
      reporte({ nivelLogro: 'LOGRO_ESPERADO' }),
      reporte({ nivelLogro: undefined }),
    ]);

    expect(stats.satisfactionPercent).toBe(100);
  });

  /**
   * Sin ninguna ficha medible no hay porcentaje que informar. Antes se devolvía
   * un 85 escrito a mano, que el panel mostraba como si fuera real.
   */
  it('es null cuando no hay ninguna ficha con nivel de logro', () => {
    expect(calcularEstadisticas([reporte({ nivelLogro: undefined })]).satisfactionPercent).toBeNull();
    expect(calcularEstadisticas([]).satisfactionPercent).toBeNull();
  });
});

describe('calcularEstadisticas — promedio general', () => {
  it('promedia los puntajes con dos decimales', () => {
    const stats = calcularEstadisticas([
      reporte({ promedio: 3 }),
      reporte({ promedio: 3.5 }),
      reporte({ promedio: 4 }),
    ]);

    expect(stats.promedioGeneral).toBe(3.5);
  });

  it('ignora las fichas sin promedio en lugar de contarlas como cero', () => {
    const stats = calcularEstadisticas([reporte({ promedio: 4 }), reporte({ promedio: undefined })]);
    expect(stats.promedioGeneral).toBe(4);
  });

  it('es null cuando ninguna tiene promedio', () => {
    expect(calcularEstadisticas([reporte()]).promedioGeneral).toBeNull();
  });
});

describe('calcularEstadisticas — instituciones distintas', () => {
  it('cuenta cada institución una sola vez', () => {
    const stats = calcularEstadisticas([
      reporte({ institucionId: 'ie-1' }),
      reporte({ institucionId: 'ie-1' }),
      reporte({ institucionId: 'ie-2' }),
    ]);

    expect(stats.institucionesDistintas).toBe(2);
  });

  /**
   * Antes se contaban partiendo el NOMBRE de la institución por « - » para
   * quitarle el código modular. Dos sedes con el mismo nombre se contaban como
   * una sola; ahora se cuenta por identificador.
   */
  it('distingue dos instituciones de igual nombre', () => {
    const stats = calcularEstadisticas([
      reporte({ institucionId: 'ie-1' }),
      reporte({ institucionId: 'ie-2' }),
    ]);

    expect(stats.institucionesDistintas).toBe(2);
  });
});
