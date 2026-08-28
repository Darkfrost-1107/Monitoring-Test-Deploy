import { describe, it, expect } from 'vitest';
import { esDeLaUgel, nombreDePlantilla, origenDePlantilla } from './identidad';

const plantilla = (over: Partial<Parameters<typeof nombreDePlantilla>[0]> = {}) => ({
  tipoMonitoreo: 'Monitoreo Docente',
  anioAcademico: 2026,
  ...over,
});

describe('nombreDePlantilla', () => {
  it('usa el nombre que puso quien la creó', () => {
    expect(nombreDePlantilla(plantilla({ descripcion: 'Ficha de aula CTA' }))).toBe(
      'Ficha de aula CTA',
    );
  });

  /**
   * El formulario pide el nombre, pero las plantillas anteriores a ese campo se
   * crearon sin él: sin respaldo el título quedaba vacío.
   */
  it('sin nombre cae en el instrumento y el año', () => {
    expect(nombreDePlantilla(plantilla())).toBe('Monitoreo Docente (2026)');
  });

  it('un nombre en blanco cuenta como ausente', () => {
    expect(nombreDePlantilla(plantilla({ descripcion: '   ' }))).toBe('Monitoreo Docente (2026)');
  });
});

describe('origenDePlantilla', () => {
  it('sin institución dueña es de la UGEL', () => {
    expect(origenDePlantilla(plantilla())).toBe('UGEL');
    expect(esDeLaUgel(plantilla())).toBe(true);
  });

  it('con institución dueña es institucional', () => {
    expect(origenDePlantilla(plantilla({ ieId: 'ie-1' }))).toBe('Institucional');
    expect(esDeLaUgel(plantilla({ ieId: 'ie-1' }))).toBe(false);
  });
});
