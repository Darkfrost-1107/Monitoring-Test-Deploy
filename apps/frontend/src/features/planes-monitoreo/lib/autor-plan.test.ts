import { describe, it, expect } from 'vitest';
import { cargoDelAutor, descripcionDelAutor } from './autor-plan';

/**
 * Pruebas de la presentación del autor del plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. La línea que combina cargo y nombre estaba
 * escrita dos veces: en la vista de cuadrícula y en la de lista.
 */

describe('cargoDelAutor', () => {
  it('traduce los roles conocidos', () => {
    expect(cargoDelAutor('director_ie')).toBe('Director de IE');
    expect(cargoDelAutor('coordinador_pedagogico')).toBe('Coordinador Pedagógico');
    expect(cargoDelAutor('jefe_taller')).toBe('Jefe de Taller');
    expect(cargoDelAutor('jefe_gestion')).toBe('Jefe de Gestión');
  });

  /** Mostrarlo crudo deja ver que falta traducirlo; ocultarlo, no. */
  it('muestra tal cual un rol sin traducción', () => {
    expect(cargoDelAutor('rol_nuevo')).toBe('rol_nuevo');
  });

  it('sin rol registrado devuelve null', () => {
    expect(cargoDelAutor(null)).toBeNull();
    expect(cargoDelAutor(undefined)).toBeNull();
    expect(cargoDelAutor('')).toBeNull();
  });
});

describe('descripcionDelAutor', () => {
  it('junta cargo y nombre con una raya', () => {
    expect(descripcionDelAutor('director_ie', 'Ana Quispe')).toBe('Director de IE — Ana Quispe');
  });

  it('sin nombre deja sólo el cargo', () => {
    expect(descripcionDelAutor('jefe_taller', null)).toBe('Jefe de Taller');
    expect(descripcionDelAutor('jefe_taller', '')).toBe('Jefe de Taller');
  });

  /** Sin cargo no se muestra la línea, aunque haya nombre. */
  it('sin cargo devuelve null', () => {
    expect(descripcionDelAutor(null, 'Ana Quispe')).toBeNull();
  });
});
