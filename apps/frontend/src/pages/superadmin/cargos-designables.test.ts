import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  CARGOS_DESIGNABLES,
  cargoDesignable,
  contraparteDe,
  type RolDesignable,
} from './cargos-designables';

/**
 * Los dos cargos que el superusuario designa.
 *
 * Estaban descritos por doce ternarios `targetRole === 'director_ugel' ? … : …`
 * repartidos entre `SuperadminPanel` y `SuperadminCreatePage` —títulos, rótulos,
 * rutas, colores, cargo y condición laboral—, cada uno con su propia copia de
 * los literales de rol.
 */

const ROLES: RolDesignable[] = [RoleCode.DIRECTOR_UGEL, RoleCode.JEFE_GESTION];

describe('CARGOS_DESIGNABLES', () => {
  it('describe exactamente los dos cargos de conducción de la UGEL', () => {
    expect(Object.keys(CARGOS_DESIGNABLES).sort()).toEqual([...ROLES].sort());
  });

  it.each(ROLES)('%s tiene todos sus textos y su ruta', (rol) => {
    const cargo = CARGOS_DESIGNABLES[rol];

    expect(cargo.nombre).toBeTruthy();
    expect(cargo.nombreCorto).toBeTruthy();
    expect(cargo.accionDesignar).toBeTruthy();
    expect(cargo.confirmarDesignacion).toBeTruthy();
    expect(cargo.ruta).toMatch(/^\/superadmin\//);
    expect(cargo.rutaDeAlta).toBe(`${cargo.ruta}/nuevo`);
  });

  it('no repite rutas entre los dos cargos', () => {
    expect(CARGOS_DESIGNABLES[RoleCode.DIRECTOR_UGEL].ruta).not.toBe(
      CARGOS_DESIGNABLES[RoleCode.JEFE_GESTION].ruta,
    );
  });

  /**
   * El Director de UGEL se registra con cargo «Especialista»: el cargo describe
   * su plaza en el padrón y el rol, su función en el sistema. Son cosas
   * distintas y por eso se declaran por separado.
   */
  it('el Director de UGEL se registra como Especialista', () => {
    expect(CARGOS_DESIGNABLES[RoleCode.DIRECTOR_UGEL].cargoEnElPadron).toBe('Especialista');
  });

  it('el Jefe de Gestión se registra con su propio cargo', () => {
    expect(CARGOS_DESIGNABLES[RoleCode.JEFE_GESTION].cargoEnElPadron).toBe('Jefe de Gestión');
  });
});

describe('cargoDesignable', () => {
  it('devuelve la descripción del rol pedido', () => {
    expect(cargoDesignable(RoleCode.JEFE_GESTION).ruta).toBe('/superadmin/jefe');
  });
});

describe('contraparteDe', () => {
  /**
   * La dupla directiva de la UGEL: cada panel muestra quién ocupa el otro
   * cargo.
   */
  it('son contraparte el uno del otro', () => {
    expect(contraparteDe(RoleCode.DIRECTOR_UGEL)).toBe(RoleCode.JEFE_GESTION);
    expect(contraparteDe(RoleCode.JEFE_GESTION)).toBe(RoleCode.DIRECTOR_UGEL);
  });

  it('ningún cargo es contraparte de sí mismo', () => {
    for (const rol of ROLES) expect(contraparteDe(rol)).not.toBe(rol);
  });
});
