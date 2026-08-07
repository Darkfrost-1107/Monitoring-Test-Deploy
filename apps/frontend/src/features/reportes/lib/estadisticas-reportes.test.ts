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
  tipo: 'DOCENTE',
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
  it('cuenta el total y lo separa por tipo de monitoreo', () => {
    const stats = calcularEstadisticas([
      reporte({ tipo: 'DOCENTE' }),
      reporte({ tipo: 'DOCENTE' }),
      reporte({ tipo: 'DIRECTIVO' }),
    ]);

    expect(stats.total).toBe(3);
    expect(stats.docentes).toBe(2);
    expect(stats.directivos).toBe(1);
  });

  it('devuelve ceros con la lista vacía', () => {
    const stats = calcularEstadisticas([]);

    expect(stats.total).toBe(0);
    expect(stats.docentes).toBe(0);
    expect(stats.directivos).toBe(0);
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
