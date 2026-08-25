import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  reportesPropios,
  reportesVisibles,
  type ReporteVisible,
  type UsuarioDeReportes,
} from './visibilidad-reportes';

/**
 * Pruebas de qué reportes ve cada usuario.
 *
 * Fase 6 de PLAN_REMEDIACION.md. `ReportesPage` decidía esto con cuatro filtros
 * que comparaban NOMBRES por inclusión de subcadenas. Un especialista llamado
 * «Ana» hacía coincidir cualquier reporte de «Juana» o «Mariana», y una
 * institución llamada «IE 123» coincidía con «IE 1234».
 *
 * Es el mismo patrón que aparece en `puedeEvaluarVisita` y en la visibilidad de
 * cronogramas. El backend nunca lo hizo así: siempre comparó identificadores.
 * Estas reglas ahora hacen lo mismo.
 *
 * ── Qué NO es esto ──
 * No es control de acceso: el endpoint de fichas completadas ya viene acotado
 * por `scopeFilter.forFicha`, que filtra por `creadoPorId`, `institucionId` y
 * `usuario.id`. Acá se separa lo propio de lo ajeno dentro de lo que ya llegó.
 */

const usuario = (over: Partial<UsuarioDeReportes> = {}): UsuarioDeReportes => ({
  role: RoleCode.ESPECIALISTA,
  ...over,
});

const reporte = (over: Partial<ReporteVisible> = {}): ReporteVisible => ({
  id: 'r1',
  monitorId: 'esp-1',
  evaluadoId: 'doc-1',
  institucionId: 'ie-1',
  ...over,
});

const ids = (lista: ReporteVisible[]) => lista.map((r) => r.id);

describe('reportesPropios', () => {
  /** «Mis reportes»: las evaluaciones hechas A esta persona. */
  it('devuelve los reportes donde la persona es la evaluada', () => {
    const actor = usuario({ docenteId: 'doc-1' });
    const mio = reporte({ id: 'mio', evaluadoId: 'doc-1' });
    const ajeno = reporte({ id: 'ajeno', evaluadoId: 'doc-9' });

    expect(ids(reportesPropios([mio, ajeno], actor))).toEqual(['mio']);
  });

  /**
   * Antes se comparaba por nombre: un docente llamado «Ana» veía como propias
   * las evaluaciones de «Juana». Con identificadores eso es imposible.
   */
  it('no confunde a dos personas de nombre parecido', () => {
    const actor = usuario({ docenteId: 'doc-ana' });
    const deJuana = reporte({ id: 'juana', evaluadoId: 'doc-juana' });

    expect(reportesPropios([deJuana], actor)).toEqual([]);
  });

  /** Un cronograma sin evaluado resuelto no es de nadie. */
  it('ignora un reporte sin evaluado asignado', () => {
    const actor = usuario({ docenteId: 'doc-1' });
    expect(reportesPropios([reporte({ evaluadoId: undefined })], actor)).toEqual([]);
  });

  it('no devuelve nada si la persona no tiene registro de docente', () => {
    expect(reportesPropios([reporte()], usuario({ docenteId: undefined }))).toEqual([]);
  });
});

describe('reportesVisibles — roles sin restricción', () => {
  it('el jefe de gestión ve todo lo que llegó', () => {
    const actor = usuario({ role: RoleCode.JEFE_GESTION });
    expect(ids(reportesVisibles([reporte({ id: 'a' }), reporte({ id: 'b' })], actor))).toEqual([
      'a',
      'b',
    ]);
  });

  it('sin usuario no filtra', () => {
    expect(ids(reportesVisibles([reporte({ id: 'a' })], null))).toEqual(['a']);
  });
});

describe('reportesVisibles — excluye lo propio', () => {
  /**
   * En la vista de reportes hechos, las evaluaciones que recibió el usuario no
   * corresponden: esas viven en «mis reportes».
   */
  it('descarta las evaluaciones recibidas por el propio usuario', () => {
    const actor = usuario({ role: RoleCode.JEFE_GESTION, docenteId: 'doc-1' });
    const recibido = reporte({ id: 'recibido', evaluadoId: 'doc-1' });
    const otro = reporte({ id: 'otro', evaluadoId: 'doc-9' });

    expect(ids(reportesVisibles([recibido, otro], actor))).toEqual(['otro']);
  });
});

describe('reportesVisibles — evaluador asignado', () => {
  const monitor = (over: Partial<UsuarioDeReportes> = {}) =>
    usuario({ role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1', ...over });

  it('ve solo los reportes que él levantó', () => {
    const suyo = reporte({ id: 'suyo', monitorId: 'esp-1' });
    const ajeno = reporte({ id: 'ajeno', monitorId: 'esp-2' });

    expect(ids(reportesVisibles([suyo, ajeno], monitor()))).toEqual(['suyo']);
  });

  it('el jefe de área se filtra igual: su cargo lo habilita a evaluar', () => {
    const actor = monitor({ role: RoleCode.JEFE_AREA });
    const suyo = reporte({ id: 'suyo', monitorId: 'esp-1' });
    const ajeno = reporte({ id: 'ajeno', monitorId: 'esp-2' });

    expect(ids(reportesVisibles([suyo, ajeno], actor))).toEqual(['suyo']);
  });

  /**
   * Antes bastaba con que el nombre del evaluador contuviera el nombre de pila
   * del usuario: «Ana» coincidía con «Juana Pérez» y le mostraba sus reportes.
   */
  it('no coincide con un evaluador de nombre parecido', () => {
    const deOtro = reporte({ id: 'otro', monitorId: 'esp-juana' });
    const actor = monitor({ especialistaId: 'esp-ana' });

    expect(reportesVisibles([deOtro], actor)).toEqual([]);
  });

  it('sin registro de especialista no ve ninguno como propio', () => {
    const actor = usuario({ role: RoleCode.ESPECIALISTA, especialistaId: undefined });
    expect(reportesVisibles([reporte()], actor)).toEqual([]);
  });
});

describe('reportesVisibles — director de institución', () => {
  const director = (over: Partial<UsuarioDeReportes> = {}) =>
    usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1', ...over });

  it('ve los reportes de su institución', () => {
    const suyo = reporte({ id: 'suyo', institucionId: 'ie-1' });
    const ajeno = reporte({ id: 'ajeno', institucionId: 'ie-9' });

    expect(ids(reportesVisibles([suyo, ajeno], director()))).toEqual(['suyo']);
  });

  /**
   * Antes se comparaba el nombre de la institución por inclusión en ambos
   * sentidos: «IE 123» hacía coincidir «IE 1234», y el director de una veía los
   * reportes de la otra.
   */
  it('no coincide con una institución de nombre parecido', () => {
    const deOtra = reporte({ id: 'otra', institucionId: 'ie-1234' });
    expect(reportesVisibles([deOtra], director({ institucion: 'ie-123' }))).toEqual([]);
  });

  it('sin institución asignada no ve ninguno', () => {
    expect(reportesVisibles([reporte()], director({ institucion: undefined }))).toEqual([]);
  });
});
