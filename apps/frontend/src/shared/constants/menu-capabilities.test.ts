import { describe, it, expect } from 'vitest';
import { RoleCode, Capability, ALL_ROLE_CODES } from '@sistema-monitoreo/shared-contracts';
import { ROLE_PERMISSIONS, type MenuItem } from './roles';
import { MENU_CAPABILITIES } from './menu-capabilities';

/**
 * Contraste entre la matriz de menú mantenida a mano y el modelo de capacidades.
 *
 * Fase 2 de PLAN_REMEDIACION.md. `ROLE_PERMISSIONS` enumera qué ve cada rol;
 * `MENU_CAPABILITIES` declara qué capacidad exige cada ítem. Ambas deberían
 * coincidir, porque las dos describen el mismo sistema.
 *
 * No coinciden. Estas pruebas fijan las discrepancias exactas en lugar de
 * corregirlas en silencio: reemplazar la matriz por la derivación cambia lo que
 * varios roles ven en pantalla, y esa es una decisión de producto.
 *
 * Cuando se tome la decisión, estas pruebas son el inventario de lo que cambia.
 */

/** Capacidades efectivas de un rol, replicando `computeEffectivePermissions`. */
const CAPACIDADES_BASE = [Capability.REPORTS_READ, Capability.MONITOREO_READ];

const CAPACIDADES_POR_ROL: Record<string, readonly Capability[]> = {
  [RoleCode.DIRECTOR_UGEL]: [
    Capability.DASHBOARD_READ,
    Capability.INSTITUCIONES_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.JEFE_GESTION]: [
    Capability.ESPECIALISTAS_READ,
    Capability.ESPECIALISTAS_WRITE,
    Capability.INSTITUCIONES_READ,
    Capability.INSTITUCIONES_WRITE,
    Capability.DOCENTES_READ,
    Capability.DOCENTES_WRITE,
    Capability.MONITOREO_EXECUTE,
    Capability.DASHBOARD_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_GESTIONAR,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.JEFE_AREA]: [
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.INSTITUCIONES_WRITE,
    Capability.DOCENTES_READ,
    Capability.DOCENTES_WRITE,
    Capability.DASHBOARD_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.ESPECIALISTA]: [
    Capability.MONITOREO_EXECUTE,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.DOCENTES_READ,
    Capability.DASHBOARD_READ,
    Capability.NOTIFICACIONES_SEND,
    Capability.VISITAS_SOLICITAR,
    Capability.CARPETA_PEDAGOGICA_READ,
  ],
  [RoleCode.DIRECTOR_INSTITUCION]: [
    Capability.DASHBOARD_READ,
    Capability.DOCENTES_READ,
    Capability.DOCENTES_WRITE,
    Capability.MONITOREO_EXECUTE,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.CARPETA_PEDAGOGICA_WRITE,
  ],
  [RoleCode.COORDINADOR_PEDAGOGICO]: [
    Capability.MONITOREO_EXECUTE,
    Capability.DOCENTES_READ,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.CARPETA_PEDAGOGICA_WRITE,
  ],
  [RoleCode.JEFE_TALLER]: [
    Capability.MONITOREO_EXECUTE,
    Capability.DOCENTES_READ,
    Capability.ESPECIALISTAS_READ,
    Capability.INSTITUCIONES_READ,
    Capability.CARPETA_PEDAGOGICA_READ,
    Capability.CARPETA_PEDAGOGICA_WRITE,
  ],
  [RoleCode.DOCENTE]: [Capability.CARPETA_PEDAGOGICA_WRITE],
  [RoleCode.INVITADO]: [Capability.DASHBOARD_READ],
  [RoleCode.SUPERUSUARIO]: [
    Capability.SUPERADMIN_ACCESS,
    Capability.ESPECIALISTAS_READ,
    Capability.ESPECIALISTAS_WRITE,
  ],
};

const capacidadesDe = (rol: string): Capability[] => [
  ...new Set([...CAPACIDADES_BASE, ...(CAPACIDADES_POR_ROL[rol] ?? [])]),
];

/** Menú que resultaría de derivarlo de las capacidades. */
const menuDerivado = (rol: string): MenuItem[] => {
  const capacidades = capacidadesDe(rol);
  return (Object.keys(MENU_CAPABILITIES) as MenuItem[]).filter((item) => {
    const requerida = MENU_CAPABILITIES[item];
    return requerida === null || capacidades.includes(requerida);
  });
};

/** Ítems que la matriz concede y las capacidades no respaldan. */
const concedidosSinRespaldo = (rol: string): MenuItem[] => {
  const derivado = new Set(menuDerivado(rol));
  return (ROLE_PERMISSIONS[rol as keyof typeof ROLE_PERMISSIONS] ?? []).filter(
    (item) => !derivado.has(item),
  );
};

describe('MENU_CAPABILITIES', () => {
  it('asigna una entrada a cada ítem de menú declarado', () => {
    const items = Object.keys(MENU_CAPABILITIES);
    for (const rol of ALL_ROLE_CODES) {
      for (const item of ROLE_PERMISSIONS[rol as keyof typeof ROLE_PERMISSIONS] ?? []) {
        expect(items).toContain(item);
      }
    }
  });
});

describe('Discrepancias entre la matriz de menú y las capacidades', () => {
  it('invitado ve cuatro ítems que el backend le rechazaría', () => {
    // Un invitado sólo tiene dashboard:read más las capacidades base. La matriz
    // le concede además instituciones y sus sub-secciones: al hacer clic
    // recibe 403 de PermissionsGuard. Es la discrepancia real, y de impacto
    // visible: navegación rota para un rol de consulta.
    expect(concedidosSinRespaldo(RoleCode.INVITADO).sort()).toEqual([
      'instituciones',
      'instituciones_coordinadores',
      'instituciones_docentes',
      'instituciones_padron',
    ]);
  });

  it('la discrepancia de jefe_area es un artefacto de esta prueba, no un defecto', () => {
    // `monitoreo_cronograma` exige monitoreo:execute, que el ROL jefe_area no
    // concede. Pero un jefe de área tiene además cargo de especialista «Jefe de
    // Área», y ESPECIALISTA_CARGO_CAPABILITIES sí se la concede.
    //
    // Esta prueba replica sólo las capacidades del rol; las efectivas componen
    // rol + cargo de especialista + cargos docentes. La derivación real usará
    // `user.permissions`, que ya vienen compuestas del backend, y por eso no
    // producirá esta diferencia.
    expect(concedidosSinRespaldo(RoleCode.JEFE_AREA)).toEqual(['monitoreo_cronograma']);
  });

  it('ningún rol pierde acceso a reportes al derivar', () => {
    // `reports:read` es capacidad base, de modo que la derivación nunca puede
    // dejar a alguien sin su bandeja de reportes.
    for (const rol of ALL_ROLE_CODES) {
      expect(menuDerivado(rol)).toContain('reportes');
    }
  });

  it('el docente conserva su menú mínimo', () => {
    expect(concedidosSinRespaldo(RoleCode.DOCENTE)).toEqual([]);
  });

  it('superusuario conserva sus tres pantallas de administración', () => {
    const derivado = menuDerivado(RoleCode.SUPERUSUARIO);
    expect(derivado).toContain('superadmin');
    expect(derivado).toContain('superadmin_director');
    expect(derivado).toContain('superadmin_jefe');
  });

  it('registra qué rol concede ítems sin respaldo de capacidad', () => {
    // Inventario vivo: si la matriz o el mapa de capacidades cambian, esta
    // prueba señala el nuevo estado en lugar de dejar la deriva sin registrar.
    const resumen = Object.fromEntries(
      ALL_ROLE_CODES.map((rol) => [rol, concedidosSinRespaldo(rol).length]).filter(
        ([, cantidad]) => (cantidad as number) > 0,
      ),
    );

    expect(resumen).toMatchInlineSnapshot(`
      {
        "invitado": 4,
        "jefe_area": 1,
      }
    `);
  });
});
