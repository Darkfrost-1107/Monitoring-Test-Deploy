import { normalizarFiltrosDeReporte } from './filtros-de-reporte.helper.js';

/**
 * Pruebas de la normalización de los filtros de reporte.
 *
 * ── El defecto ──
 * El controlador recibe `@Query() query: any` y lo entregaba tal cual al
 * repositorio, cuyo tipo declara `anioAcademico?: number`. Por la cadena de
 * consulta llega siempre texto, así que el repositorio armaba
 * `where.anioAcademico = '2026'` contra una columna `Int` y la consulta fallaba.
 *
 * En pantalla se veía como que el analisis por criterio no estaba disponible en
 * cuanto se elegia un año, mientras «Todos los años» funcionaba —ese caso no
 * envia el parametro—.
 */

describe('normalizarFiltrosDeReporte', () => {
  it('convierte el ano que llega como texto', () => {
    const filtros = normalizarFiltrosDeReporte({ anioAcademico: '2026' as unknown as number });

    expect(filtros.anioAcademico).toBe(2026);
  });

  it('convierte la paginacion que llega como texto', () => {
    const filtros = normalizarFiltrosDeReporte({
      page: '2' as unknown as number,
      limit: '50' as unknown as number,
    });

    expect(filtros.page).toBe(2);
    expect(filtros.limit).toBe(50);
  });

  it('deja pasar los numeros que ya son numeros', () => {
    expect(normalizarFiltrosDeReporte({ anioAcademico: 2026 }).anioAcademico).toBe(2026);
  });

  /** Sin filtro de año no se envía el parámetro: es el caso «Todos los años». */
  it('deja el ano sin definir cuando no viene', () => {
    expect(normalizarFiltrosDeReporte({}).anioAcademico).toBeUndefined();
    expect(
      normalizarFiltrosDeReporte({ anioAcademico: '' as unknown as number }).anioAcademico,
    ).toBeUndefined();
  });

  /**
   * Un valor ilegible descarta el filtro en vez de convertirse en `NaN`: la
   * consulta trae de más, que se nota, en lugar de no traer nada en silencio.
   */
  it('descarta un ano ilegible en vez de dejarlo en NaN', () => {
    const filtros = normalizarFiltrosDeReporte({ anioAcademico: 'abc' as unknown as number });

    expect(filtros.anioAcademico).toBeUndefined();
  });

  it('no toca el resto de los filtros', () => {
    const filtros = normalizarFiltrosDeReporte({
      institucionId: 'ie-1',
      nivelLogro: 'LOGRO_ESPERADO',
      fechaDesde: '2026-01-01',
    });

    expect(filtros.institucionId).toBe('ie-1');
    expect(filtros.nivelLogro).toBe('LOGRO_ESPERADO');
    expect(filtros.fechaDesde).toBe('2026-01-01');
  });
});
