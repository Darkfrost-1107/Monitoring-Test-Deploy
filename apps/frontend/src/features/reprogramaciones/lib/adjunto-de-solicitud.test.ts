import { describe, it, expect } from 'vitest';
import { adjuntoDeSolicitud, nombreDelAprobador } from './adjunto-de-solicitud';

/**
 * El sustento adjunto a una solicitud de reprogramación, y quién la resolvió.
 *
 * Los dos se armaban dentro del mapeo de `use-cronogramas-data` y se mostraban
 * en `DecidirReprogramacionForm`, que es el panel de trazabilidad: la pantalla
 * donde se consulta qué se adjuntó y quién decidió.
 */

describe('adjuntoDeSolicitud', () => {
  it('toma el nombre del archivo del final de la URL y conserva la URL', () => {
    expect(adjuntoDeSolicitud('https://archivos.ugel.pe/sustentos/oficio-123.pdf')).toEqual({
      nombre: 'oficio-123.pdf',
      url: 'https://archivos.ugel.pe/sustentos/oficio-123.pdf',
    });
  });

  it('decodifica los nombres con espacios o tildes', () => {
    const adjunto = adjuntoDeSolicitud('https://archivos.ugel.pe/Informe%20t%C3%A9cnico.pdf');
    expect(adjunto?.nombre).toBe('Informe técnico.pdf');
  });

  it('ignora los parámetros de la URL al armar el nombre', () => {
    const adjunto = adjuntoDeSolicitud('https://archivos.ugel.pe/oficio.pdf?token=abc');
    expect(adjunto?.nombre).toBe('oficio.pdf');
  });

  /**
   * DEFECTO CORREGIDO. El mapeo hacía `url.split('/').pop() || 'oficio.pdf'`:
   * una URL de la que no se podía extraer un nombre se mostraba como
   * «oficio.pdf», un documento que nadie adjuntó con ese nombre.
   */
  it('no inventa un nombre cuando la URL no lo tiene', () => {
    const adjunto = adjuntoDeSolicitud('https://archivos.ugel.pe/');
    expect(adjunto?.nombre).toBe('Documento adjunto');
    expect(adjunto?.url).toBe('https://archivos.ugel.pe/');
  });

  it('no hay adjunto cuando no hay URL', () => {
    expect(adjuntoDeSolicitud('')).toBeNull();
    expect(adjuntoDeSolicitud(null)).toBeNull();
    expect(adjuntoDeSolicitud(undefined)).toBeNull();
    expect(adjuntoDeSolicitud('   ')).toBeNull();
  });
});

describe('nombreDelAprobador', () => {
  it('junta el cargo y el nombre de quien resolvió', () => {
    expect(nombreDelAprobador('Jefe de Gestión', 'Ana Torres')).toBe('Jefe de Gestión Ana Torres');
  });

  it('sin cargo usa sólo el nombre', () => {
    expect(nombreDelAprobador(null, 'Ana Torres')).toBe('Ana Torres');
  });

  /**
   * El respaldo era el identificador de quien resolvió: el panel de
   * trazabilidad mostraba un UUID donde debía ir un nombre.
   */
  it('devuelve nulo cuando no hay nombre, en vez de un identificador', () => {
    expect(nombreDelAprobador('Jefe de Gestión', null)).toBeNull();
    expect(nombreDelAprobador(null, '')).toBeNull();
    expect(nombreDelAprobador(null, undefined)).toBeNull();
  });
});
