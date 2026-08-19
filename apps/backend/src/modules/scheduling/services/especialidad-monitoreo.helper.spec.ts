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
});
