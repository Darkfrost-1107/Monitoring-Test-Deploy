import {
  motivoInactivacionBloqueada,
  tieneDependenciasActivas,
} from './inactivacion-plan.helper.js';

/**
 * No se inactiva un plan que sostiene monitoreo activo. La regla del «qué
 * cuenta como activo» se prueba acá; la consulta de las dependencias vive en el
 * servicio.
 */
describe('tieneDependenciasActivas', () => {
  it('bloquea si hay plantillas vigentes', () => {
    expect(tieneDependenciasActivas({ plantillasVigentes: 1, cronogramas: 0 })).toBe(true);
  });

  it('bloquea si hay cronogramas', () => {
    expect(tieneDependenciasActivas({ plantillasVigentes: 0, cronogramas: 3 })).toBe(true);
  });

  it('bloquea si hay de las dos cosas', () => {
    expect(tieneDependenciasActivas({ plantillasVigentes: 2, cronogramas: 5 })).toBe(true);
  });

  it('deja inactivar si no cuelga nada', () => {
    expect(tieneDependenciasActivas({ plantillasVigentes: 0, cronogramas: 0 })).toBe(false);
  });
});

describe('motivoInactivacionBloqueada', () => {
  it('no da motivo cuando nada depende del plan', () => {
    expect(motivoInactivacionBloqueada({ plantillasVigentes: 0, cronogramas: 0 })).toBe('');
  });

  it('nombra solo las plantillas cuando es lo unico', () => {
    const msg = motivoInactivacionBloqueada({ plantillasVigentes: 2, cronogramas: 0 });
    expect(msg).toContain('plantillas vigentes');
    expect(msg).not.toContain('cronogramas');
  });

  it('nombra solo los cronogramas cuando es lo unico', () => {
    const msg = motivoInactivacionBloqueada({ plantillasVigentes: 0, cronogramas: 4 });
    expect(msg).toContain('cronogramas de visita');
    expect(msg).not.toContain('plantillas');
  });

  it('nombra los dos cuando hay de los dos', () => {
    const msg = motivoInactivacionBloqueada({ plantillasVigentes: 1, cronogramas: 1 });
    expect(msg).toContain('plantillas vigentes');
    expect(msg).toContain('cronogramas de visita');
  });
});
