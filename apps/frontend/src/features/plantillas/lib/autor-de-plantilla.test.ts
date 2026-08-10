import { describe, it, expect } from 'vitest';
import { etiquetaDeAutor } from './autor-de-plantilla';

/**
 * El catálogo mostraba el nombre de la institución como único origen, de modo
 * que al Director le aparecían tres tarjetas idénticas —la suya, la del
 * Coordinador Pedagógico y la del Jefe de Taller— sin nada que las distinguiera.
 * Con una vigente por actor, eso se lee como plantillas duplicadas.
 */

describe('etiquetaDeAutor', () => {
  it('nombra el cargo de cada actor de la institución', () => {
    expect(etiquetaDeAutor('director_ie')).toBe('Director');
    expect(etiquetaDeAutor('coordinador_pedagogico')).toBe('Coordinador Pedagógico');
    expect(etiquetaDeAutor('jefe_taller')).toBe('Jefe de Taller');
  });

  it('nombra a la UGEL como autora de lo que crea el Jefe de Gestión', () => {
    expect(etiquetaDeAutor('jefe_gestion')).toBe('UGEL');
  });

  /**
   * Las plantillas anteriores al registro del rol del autor no traen el campo.
   * Venían de la UGEL, y así las trata `esDeUgel` en `visibilidad-plantillas.ts`;
   * la etiqueta tiene que decir lo mismo que el filtro.
   */
  it('trata como de la UGEL a las plantillas antiguas sin autor registrado', () => {
    expect(etiquetaDeAutor(undefined)).toBe('UGEL');
  });
});
