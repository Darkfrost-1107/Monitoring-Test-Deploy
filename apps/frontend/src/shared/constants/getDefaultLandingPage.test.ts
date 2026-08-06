import { describe, it, expect } from 'vitest';
import { RoleCode, ALL_ROLE_CODES } from '@sistema-monitoreo/shared-contracts';
import { getDefaultLandingPage, ROLE_PERMISSIONS, type MenuItem } from './roles';

/**
 * El destino de aterrizaje debe ser alcanzable para el rol que lo recibe.
 *
 * Fase 2 de PLAN_REMEDIACION.md. El plan proponía sustituir esta función por
 * una derivación: «la primera capacidad de navegación disponible». Al
 * implementarla quedó claro que sería un retroceso —cada destino es una decisión
 * deliberada sobre cuál es la tarea principal de esa persona, y derivarlo del
 * orden de declaración la sustituiría por un accidente—, de modo que la función
 * se conserva y lo que se añade es esta garantía.
 *
 * El riesgo real de una tabla escrita a mano no es que sea explícita, sino que
 * apunte a una pantalla que el rol no puede abrir. Eso es lo que se verifica.
 */

/** Ítem de menú que corresponde a cada ruta de aterrizaje. */
const ITEM_POR_RUTA: Record<string, MenuItem> = {
  '/superadmin': 'superadmin',
  '/instituciones/padron': 'instituciones_padron',
  '/especialistas': 'especialistas',
  '/monitoreo/calendario': 'monitoreo_calendario',
  '/dashboard': 'dashboard',
  '/reportes': 'reportes',
};

describe('getDefaultLandingPage', () => {
  it('devuelve una ruta para todo rol del contrato', () => {
    for (const rol of ALL_ROLE_CODES) {
      expect(getDefaultLandingPage(rol)).toMatch(/^\//);
    }
  });

  it('todo destino corresponde a un ítem de menú conocido', () => {
    for (const rol of ALL_ROLE_CODES) {
      expect(Object.keys(ITEM_POR_RUTA)).toContain(getDefaultLandingPage(rol));
    }
  });

  it('cada rol puede abrir la pantalla a la que aterriza', () => {
    // Esta es la garantía que importa: aterrizar en una pantalla que el propio
    // menú no concede deja al usuario en una página vacía o redirigido en bucle
    // nada más iniciar sesión.
    for (const rol of ALL_ROLE_CODES) {
      const destino = getDefaultLandingPage(rol);
      const item = ITEM_POR_RUTA[destino];
      const permitidos = ROLE_PERMISSIONS[rol] ?? [];

      expect(permitidos, `${rol} aterriza en ${destino} sin tener acceso a '${item}'`).toContain(
        item,
      );
    }
  });

  describe('destinos deliberados que no deben cambiar sin decisión', () => {
    it.each([
      [RoleCode.SUPERUSUARIO, '/superadmin'],
      [RoleCode.JEFE_GESTION, '/especialistas'],
      [RoleCode.JEFE_AREA, '/instituciones/padron'],
      [RoleCode.ESPECIALISTA, '/monitoreo/calendario'],
      [RoleCode.COORDINADOR_PEDAGOGICO, '/monitoreo/calendario'],
      [RoleCode.JEFE_TALLER, '/monitoreo/calendario'],
      [RoleCode.DIRECTOR_INSTITUCION, '/dashboard'],
      [RoleCode.DOCENTE, '/reportes'],
    ])('%s aterriza en %s', (rol, esperado) => {
      expect(getDefaultLandingPage(rol)).toBe(esperado);
    });

    it('invitado usa el destino por defecto', () => {
      expect(getDefaultLandingPage(RoleCode.INVITADO)).toBe('/dashboard');
    });
  });
});
