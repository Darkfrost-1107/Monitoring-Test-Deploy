import { describe, it, expect } from 'vitest';
import { motivoSinInstrumento } from './instrumento';

describe('motivoSinInstrumento', () => {
  it('con plantilla activa no hay nada que decir', () => {
    expect(motivoSinInstrumento(true, { cargando: false, fallo: false })).toBeNull();
  });

  /** Mientras carga no se ha decidido nada: no se acusa una falta que no consta. */
  it('mientras el catálogo carga lo dice así', () => {
    expect(motivoSinInstrumento(false, { cargando: true, fallo: false })).toMatch(/Cargando/i);
  });

  it('si el catálogo falló lo distingue de no haber plantilla', () => {
    expect(motivoSinInstrumento(false, { cargando: false, fallo: true })).toMatch(
      /No se pudo cargar/i,
    );
  });

  /** Catálogo resuelto y sin plantilla aplicable: hay que publicar una. */
  it('sin plantilla vigente dice a quién pedirla', () => {
    const motivo = motivoSinInstrumento(false, { cargando: false, fallo: false });

    expect(motivo).toMatch(/plantilla vigente/i);
    expect(motivo).toMatch(/Jefatura de Gestión Pedagógica/i);
  });

  /** La plantilla activa manda sobre cualquier estado del catálogo. */
  it('una plantilla ya resuelta gana aunque el catálogo esté refrescando', () => {
    expect(motivoSinInstrumento(true, { cargando: true, fallo: true })).toBeNull();
  });
});
