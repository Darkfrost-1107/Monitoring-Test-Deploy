import { describe, it, expect } from 'vitest';
import { especialidadesExtrasDisponibles, areaYaUsada } from './especialidades-extras';

/**
 * El selector de áreas extras no puede ofrecer la que ya es la principal ni una
 * ya agregada. La comparación ignora tildes: un dato viejo llega sin tilde
 * («Comunicacion») y el catálogo la tiene («Comunicación»), pero es la misma área.
 */
describe('especialidadesExtrasDisponibles', () => {
  it('excluye la especialidad principal aunque venga sin tilde', () => {
    const disponibles = especialidadesExtrasDisponibles('SECUNDARIA', 'Comunicacion', []);
    expect(disponibles).not.toContain('Comunicación');
    expect(disponibles).toContain('Matemática');
  });

  it('excluye la principal con tilde y las ya agregadas', () => {
    const disponibles = especialidadesExtrasDisponibles('SECUNDARIA', 'Matemática', ['Inglés']);
    expect(disponibles).not.toContain('Matemática');
    expect(disponibles).not.toContain('Inglés');
    expect(disponibles).toContain('Comunicación');
  });

  it('ofrece todo el catálogo del nivel cuando no hay principal ni extras', () => {
    const disponibles = especialidadesExtrasDisponibles('SECUNDARIA', '', []);
    expect(disponibles).toContain('Comunicación');
    expect(disponibles).toContain('Educación para el Trabajo');
  });
});

describe('areaYaUsada', () => {
  it('reconoce la misma área con y sin tilde', () => {
    expect(areaYaUsada('Comunicación', 'Comunicacion', [])).toBe(true);
    expect(areaYaUsada('Matemática', 'Comunicacion', ['matematica'])).toBe(true);
    expect(areaYaUsada('Inglés', 'Comunicacion', [])).toBe(false);
  });
});
