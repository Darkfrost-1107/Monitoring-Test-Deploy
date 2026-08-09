import { describe, it, expect } from 'vitest';
import { estadoDelCampoLema, validarLema } from './campo-lema';

/**
 * Pruebas del campo de lema en el formulario de plantilla.
 *
 * El lema es propiedad del año, no de la plantilla: la primera plantilla del
 * año lo carga y las siguientes lo muestran ya cargado. El campo tiene que
 * distinguir esos dos momentos sin dejar que la segunda plantilla lo pise por
 * descuido.
 */

describe('estadoDelCampoLema', () => {
  it('mientras se consulta el año, no decide nada todavía', () => {
    const estado = estadoDelCampoLema({ lemaGuardado: null, cargando: true, corrigiendo: false });
    expect(estado.modo).toBe('cargando');
  });

  it('pide el lema cuando el año no lo tiene', () => {
    const estado = estadoDelCampoLema({ lemaGuardado: null, cargando: false, corrigiendo: false });
    expect(estado).toEqual({ modo: 'alta', lemaGuardado: null });
  });

  /**
   * El caso que evita el pisotón: la segunda plantilla de 2026 no debe poder
   * cambiar el lema sin que alguien lo pida explícitamente.
   */
  it('muestra el lema en solo lectura cuando el año ya lo tiene', () => {
    const estado = estadoDelCampoLema({
      lemaGuardado: 'Año de la recuperación',
      cargando: false,
      corrigiendo: false,
    });
    expect(estado).toEqual({ modo: 'lectura', lemaGuardado: 'Año de la recuperación' });
  });

  it('permite corregir un lema ya cargado cuando se pide explícitamente', () => {
    const estado = estadoDelCampoLema({
      lemaGuardado: 'Año de la recuperación',
      cargando: false,
      corrigiendo: true,
    });
    expect(estado).toEqual({ modo: 'correccion', lemaGuardado: 'Año de la recuperación' });
  });

  /** Sin lema guardado no hay nada que corregir: sigue siendo un alta. */
  it('ignora la corrección cuando el año no tiene lema', () => {
    const estado = estadoDelCampoLema({ lemaGuardado: null, cargando: false, corrigiendo: true });
    expect(estado).toEqual({ modo: 'alta', lemaGuardado: null });
  });
});

describe('validarLema', () => {
  it('acepta un lema con texto', () => {
    expect(validarLema('Año de la recuperación y consolidación de la economía peruana')).toBeNull();
  });

  it('rechaza el vacío', () => {
    expect(validarLema('')).toBe('El lema oficial del año es obligatorio.');
  });

  it('rechaza los espacios solos', () => {
    expect(validarLema('    ')).toBe('El lema oficial del año es obligatorio.');
  });

  it('rechaza un lema más largo que el máximo del contrato', () => {
    expect(validarLema('A'.repeat(251))).toBe(
      'El lema oficial no puede superar los 250 caracteres.',
    );
  });

  it('acepta exactamente el máximo', () => {
    expect(validarLema('A'.repeat(250))).toBeNull();
  });
});
