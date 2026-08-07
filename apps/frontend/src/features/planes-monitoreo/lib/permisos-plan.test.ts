import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { puedeGestionarPlan } from './permisos-plan';

/**
 * Pruebas de quién puede gestionar cada plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. El frontend tenía una sola de las dos reglas
 * que aplica el servidor en `monitoring-plan.service.ts`.
 */

const deUgel = { tipoEntidad: 'UGEL' };
const deIE = { tipoEntidad: 'IE' };

describe('puedeGestionarPlan — jefe de gestión', () => {
  const jefe = { role: RoleCode.JEFE_GESTION };

  it('gestiona los planes de la UGEL', () => {
    expect(puedeGestionarPlan(deUgel, jefe)).toBe(true);
  });

  it('no gestiona los planes de una I.E.', () => {
    expect(puedeGestionarPlan(deIE, jefe)).toBe(false);
  });
});

describe('puedeGestionarPlan — director de institución', () => {
  const director = { role: RoleCode.DIRECTOR_INSTITUCION };

  it('gestiona los planes de su tipo de entidad', () => {
    expect(puedeGestionarPlan(deIE, director)).toBe(true);
  });

  /**
   * Ésta es la regla que faltaba. El servidor la aplica en `toggleEstado` y en
   * `hardDelete`; el frontend le mostraba los botones y el clic terminaba en un
   * 403.
   */
  it('no gestiona los planes de la UGEL', () => {
    expect(puedeGestionarPlan(deUgel, director)).toBe(false);
  });
});

describe('puedeGestionarPlan — resto de roles', () => {
  it('gestionan planes de ambos tipos, igual que en el servidor', () => {
    const especialista = { role: RoleCode.ESPECIALISTA };

    expect(puedeGestionarPlan(deUgel, especialista)).toBe(true);
    expect(puedeGestionarPlan(deIE, especialista)).toBe(true);
  });

  it('sin usuario no se ofrece ninguna acción', () => {
    expect(puedeGestionarPlan(deUgel, null)).toBe(false);
    expect(puedeGestionarPlan(deIE, undefined)).toBe(false);
  });
});
