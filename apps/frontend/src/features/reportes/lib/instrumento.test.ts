import { describe, it, expect } from 'vitest';
import type { TipoPlantilla } from '@sistema-monitoreo/shared-contracts';
import {
  esInstrumentoEib,
  ETIQUETA_DE_INSTRUMENTO,
  instrumentoDe,
  PLANTILLA_DE_INSTRUMENTO,
  tipoDeVisitaDe,
} from './instrumento';

/**
 * Pruebas del instrumento de una ficha.
 *
 * Reemplazan el olfateo de cadenas que compensaba un campo en el que no se podía
 * confiar: `tipoMonitoreo` traía el instrumento o el tipo de la visita según los
 * datos, y el código deducía «es EIB» con `includes('EIB')` sobre el tipo y sobre
 * el NOMBRE de la plantilla.
 */

const TODOS: TipoPlantilla[] = ['DOCENTE', 'DOCENTE_EIB', 'DIRECTIVO'];

describe('esInstrumentoEib', () => {
  it('reconoce la ficha EIB', () => {
    expect(esInstrumentoEib('DOCENTE_EIB')).toBe(true);
  });

  it('no confunde la ficha docente regular ni la directiva', () => {
    expect(esInstrumentoEib('DOCENTE')).toBe(false);
    expect(esInstrumentoEib('DIRECTIVO')).toBe(false);
  });

  it('tolera que no venga el instrumento', () => {
    expect(esInstrumentoEib(undefined)).toBe(false);
  });
});

/**
 * La ficha regular y la EIB son las dos de un monitoreo docente: el instrumento
 * determina el tipo de visita sin ambiguedad.
 */
describe('tipoDeVisitaDe', () => {
  it('la ficha EIB corresponde a una visita docente', () => {
    expect(tipoDeVisitaDe('DOCENTE_EIB')).toBe('DOCENTE');
  });

  it('la ficha docente regular corresponde a una visita docente', () => {
    expect(tipoDeVisitaDe('DOCENTE')).toBe('DOCENTE');
  });

  it('la ficha directiva corresponde a una visita directiva', () => {
    expect(tipoDeVisitaDe('DIRECTIVO')).toBe('DIRECTIVO');
  });

  /** Sin instrumento se asume docente, que es el caso corriente. */
  it('cae en docente si no hay instrumento', () => {
    expect(tipoDeVisitaDe(undefined)).toBe('DOCENTE');
  });
});

/**
 * El camino de respaldo del panel arma las filas desde los cronogramas, donde no
 * hay ficha y por lo tanto no hay instrumento.
 */
describe('instrumentoDe', () => {
  it('usa el instrumento de la ficha cuando esta', () => {
    expect(instrumentoDe({ instrumento: 'DOCENTE_EIB', tipo: 'DOCENTE' })).toBe('DOCENTE_EIB');
  });

  it('cae en el tipo de la visita cuando no hay ficha', () => {
    expect(instrumentoDe({ tipo: 'DOCENTE' })).toBe('DOCENTE');
  });

  /** Suponer «docente» para una visita directiva seria un error. */
  it('no convierte una visita directiva en docente', () => {
    expect(instrumentoDe({ tipo: 'DIRECTIVO' })).toBe('DIRECTIVO');
  });
});

/**
 * Las dos tablas se declaran como `Record<TipoPlantilla, string>`: si aparece un
 * instrumento nuevo, la compilación falla en cada tabla que lo omita en lugar de
 * caer en silencio a un valor por defecto.
 */
describe('tablas de traduccion', () => {
  it('cubren todos los instrumentos', () => {
    for (const instrumento of TODOS) {
      expect(ETIQUETA_DE_INSTRUMENTO[instrumento]).toBeTruthy();
      expect(PLANTILLA_DE_INSTRUMENTO[instrumento]).toBeTruthy();
    }
  });

  it('distinguen la ficha EIB de la regular en el rotulo', () => {
    expect(ETIQUETA_DE_INSTRUMENTO.DOCENTE_EIB).not.toBe(ETIQUETA_DE_INSTRUMENTO.DOCENTE);
  });

  it('dan el nombre con el que se busca la plantilla en el catalogo', () => {
    expect(PLANTILLA_DE_INSTRUMENTO.DOCENTE_EIB).toBe('Monitoreo Docente EIB');
    expect(PLANTILLA_DE_INSTRUMENTO.DIRECTIVO).toBe('Monitoreo Directivo');
  });
});
