import {
  requiereEspecialidadCompartida,
  compartenEspecialidad,
} from './especialidad-monitoreo.helper.js';

describe('requiereEspecialidadCompartida', () => {
  it('exige compartir especialidad en Secundaria para una visita docente', () => {
    expect(requiereEspecialidadCompartida('Secundaria', 'DOCENTE')).toBe(true);
  });

  it('no aplica a la visita directiva (se evalúa la conducción, no una materia)', () => {
    expect(requiereEspecialidadCompartida('Secundaria', 'DIRECTIVO')).toBe(false);
  });

  it('no aplica fuera de Secundaria', () => {
    expect(requiereEspecialidadCompartida('Primaria', 'DOCENTE')).toBe(false);
    expect(requiereEspecialidadCompartida('Inicial', 'DOCENTE')).toBe(false);
  });

  it('reconoce el nivel sin importar tildes ni mayúsculas', () => {
    expect(requiereEspecialidadCompartida('SECUNDARIA', 'DOCENTE')).toBe(true);
  });
});

describe('compartenEspecialidad', () => {
  it('acepta cuando la especialidad del docente está entre las del especialista', () => {
    expect(compartenEspecialidad(['Matematica', 'Comunicacion'], ['Comunicacion'])).toBe(true);
  });

  it('rechaza cuando no hay intersección', () => {
    expect(compartenEspecialidad(['Matematica'], ['Comunicacion'])).toBe(false);
  });

  it('compara sin tildes ni mayúsculas', () => {
    // El especialista maneja "Comunicación", el docente figura como "COMUNICACION".
    expect(compartenEspecialidad(['Comunicación'], ['COMUNICACION'])).toBe(true);
  });

  it('rechaza si alguno no tiene especialidades', () => {
    expect(compartenEspecialidad([], ['Matematica'])).toBe(false);
    expect(compartenEspecialidad(['Matematica'], [])).toBe(false);
  });

  describe('a quien NO le aplica', () => {
    /**
     * La regla es del especialista de UGEL, que se asigna por área. Dentro de
     * una institución, el Coordinador y el Jefe de Taller se rigen por su
     * cartera de docentes asignados, y el Director por todo su personal.
     *
     * Ninguno tiene registro de especialista, así que su lista de áreas llega
     * vacía —y una lista vacía no comparte especialidad con nadie—. Aplicarles
     * esta regla les impedía programar cualquier visita en Secundaria.
     */
    it.each([
      ['el director de la I.E.', 'director_institucion'],
      ['el coordinador pedagogico', 'coordinador_pedagogico'],
      ['el jefe de taller', 'jefe_taller'],
    ])('no se le exige compartir area a %s', (_caso, rol) => {
      expect(requiereEspecialidadCompartida('Secundaria', 'DOCENTE', rol)).toBe(false);
    });

    it('al especialista de UGEL si se le exige', () => {
      expect(requiereEspecialidadCompartida('Secundaria', 'DOCENTE', 'especialista')).toBe(true);
    });

    it('sin rol se comporta como antes, para no romper a quien no lo pasa', () => {
      expect(requiereEspecialidadCompartida('Secundaria', 'DOCENTE')).toBe(true);
    });
  });
});
