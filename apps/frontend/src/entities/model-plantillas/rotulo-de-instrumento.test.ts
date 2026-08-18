import { describe, it, expect } from 'vitest';
import type { TipoPlantilla } from '@sistema-monitoreo/shared-contracts';
import { instrumentoDeRotulo, ROTULO_DE_INSTRUMENTO } from './rotulo-de-instrumento';
import { TIPOS_MONITOREO } from './constants';

/**
 * Pruebas de la traducción entre el instrumento del contrato y el rótulo del
 * formulario.
 *
 * `Plantilla.tipoMonitoreo` guarda el rótulo y el contrato el valor, con el
 * mismo nombre de campo en las dos. La vuelta inversa se hacía con
 * `includes('EIB')` sobre el rótulo en mayúsculas.
 */

const TODOS: TipoPlantilla[] = ['DOCENTE', 'DOCENTE_EIB', 'DIRECTIVO'];

describe('ROTULO_DE_INSTRUMENTO', () => {
  it('cubre todos los instrumentos', () => {
    for (const instrumento of TODOS) {
      expect(ROTULO_DE_INSTRUMENTO[instrumento]).toBeTruthy();
    }
  });

  /**
   * La tabla y las opciones del formulario tienen que decir lo mismo: si
   * divergen, una plantilla guardada no se puede volver a reconocer.
   */
  it('coincide con las opciones que ofrece el formulario', () => {
    expect([...TIPOS_MONITOREO].sort()).toEqual(Object.values(ROTULO_DE_INSTRUMENTO).sort());
  });
});

describe('instrumentoDeRotulo', () => {
  it('reconoce los tres rotulos del formulario', () => {
    expect(instrumentoDeRotulo('Monitoreo Docente')).toBe('DOCENTE');
    expect(instrumentoDeRotulo('Monitoreo Docente EIB')).toBe('DOCENTE_EIB');
    expect(instrumentoDeRotulo('Monitoreo Directivo')).toBe('DIRECTIVO');
  });

  /** Ida y vuelta: traducir en un sentido y en el otro devuelve lo mismo. */
  it('es la inversa exacta de la tabla', () => {
    for (const instrumento of TODOS) {
      expect(instrumentoDeRotulo(ROTULO_DE_INSTRUMENTO[instrumento])).toBe(instrumento);
    }
  });

  it('tolera espacios al borde', () => {
    expect(instrumentoDeRotulo('  Monitoreo Docente EIB  ')).toBe('DOCENTE_EIB');
  });

  /**
   * Con `includes('EIB')` cualquier rótulo que contuviera esas letras caía en la
   * rama EIB. La comparación exacta no se deja llevar por el parecido.
   */
  it('no confunde un rotulo parecido', () => {
    expect(instrumentoDeRotulo('Monitoreo Docente EIB 2027')).toBe('DOCENTE');
    expect(instrumentoDeRotulo('Plan EIB')).toBe('DOCENTE');
  });

  it('cae en docente ante un rotulo desconocido', () => {
    expect(instrumentoDeRotulo('')).toBe('DOCENTE');
    expect(instrumentoDeRotulo('Otra cosa')).toBe('DOCENTE');
  });
});
