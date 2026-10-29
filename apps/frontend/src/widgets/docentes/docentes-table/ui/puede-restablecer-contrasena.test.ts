import { describe, it, expect } from 'vitest';
import { puedeRestablecerContrasena } from './puede-restablecer-contrasena';

const base = { docenteId: 'd-1', activo: true };

describe('puedeRestablecerContrasena', () => {
  it('requiere la capacidad', () => {
    expect(
      puedeRestablecerContrasena({ ...base, tieneCapacidad: false, miDocenteId: 'otro' }),
    ).toBe(false);
  });

  it('no aplica a la propia fila', () => {
    expect(puedeRestablecerContrasena({ ...base, tieneCapacidad: true, miDocenteId: 'd-1' })).toBe(
      false,
    );
  });

  it('aplica al personal activo de otra persona', () => {
    expect(puedeRestablecerContrasena({ ...base, tieneCapacidad: true, miDocenteId: 'otro' })).toBe(
      true,
    );
    expect(
      puedeRestablecerContrasena({ ...base, tieneCapacidad: true, miDocenteId: undefined }),
    ).toBe(true);
  });

  it('no aplica al personal dado de baja', () => {
    expect(
      puedeRestablecerContrasena({
        ...base,
        activo: false,
        tieneCapacidad: true,
        miDocenteId: 'otro',
      }),
    ).toBe(false);
  });
});
