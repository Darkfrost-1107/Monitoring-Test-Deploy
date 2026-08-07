import { describe, it, expect } from 'vitest';
import { RoleCode, NivelEducativoEBR } from '@sistema-monitoreo/shared-contracts';
import {
  ESTADOS_DE_SOLICITUD,
  TODOS_LOS_ESTADOS,
  armarBandeja,
  solicitudesVisibles,
  visitasReprogramables,
  type SolicitudEnBandeja,
  type UsuarioDeBandeja,
  type VisitaDeBandeja,
} from './bandeja';

/**
 * Qué solicitudes de reprogramación ve cada quien en su bandeja.
 *
 * La regla vivía como dos `useMemo` dentro de `BandejaReprogramaciones`, un
 * componente de 347 líneas, y reimplementaba en paralelo el enrutamiento que
 * `puedeDecidirReprogramacion` ya resolvía —con una diferencia: al director de
 * institución no le aplicaba la restricción a Secundaria—.
 */

const visita = (over: Partial<VisitaDeBandeja> = {}): VisitaDeBandeja => ({
  id: 'v-1',
  monitorId: 'esp-1',
  nivel: NivelEducativoEBR.SECUNDARIA,
  institucionId: 'ie-1',
  institucion: 'I.E. Ejemplo',
  estado: 'PROGRAMADO',
  ...over,
});

const solicitud = (over: Partial<SolicitudEnBandeja> = {}): SolicitudEnBandeja => ({
  id: 's-1',
  estado: 'PENDIENTE',
  fechaRegistro: '2026-03-10T12:00:00.000Z',
  solicitanteRolAlCrear: RoleCode.ESPECIALISTA,
  visit: visita(),
  ...over,
});

const usuario = (over: Partial<UsuarioDeBandeja> & { role: string }): UsuarioDeBandeja => ({
  ...over,
});

describe('armarBandeja', () => {
  it('junta cada visita con su solicitud y descarta las visitas sin ninguna', () => {
    const visitas = [visita({ id: 'v-1' }), visita({ id: 'v-2' })];
    const porVisita = { 'v-1': { id: 's-1', estado: 'PENDIENTE' as const, fechaRegistro: '2026-03-10' } };

    const bandeja = armarBandeja(visitas, porVisita);

    expect(bandeja).toHaveLength(1);
    expect(bandeja[0].id).toBe('s-1');
    expect(bandeja[0].visit.id).toBe('v-1');
  });

  it('ordena de la solicitud más reciente a la más antigua', () => {
    const visitas = [visita({ id: 'v-1' }), visita({ id: 'v-2' }), visita({ id: 'v-3' })];
    const porVisita = {
      'v-1': { id: 'a', estado: 'PENDIENTE' as const, fechaRegistro: '2026-03-01T00:00:00.000Z' },
      'v-2': { id: 'b', estado: 'PENDIENTE' as const, fechaRegistro: '2026-05-01T00:00:00.000Z' },
      'v-3': { id: 'c', estado: 'PENDIENTE' as const, fechaRegistro: '2026-04-01T00:00:00.000Z' },
    };

    expect(armarBandeja(visitas, porVisita).map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('devuelve una bandeja vacía sin solicitudes', () => {
    expect(armarBandeja([visita()], {})).toEqual([]);
  });
});

describe('solicitudesVisibles — quien solicita', () => {
  /**
   * Antes se comparaba `visit.especialista` con «nombres apellidos» del
   * usuario. Dos personas de nombre parecido, o un cambio de formato en cómo
   * se arma ese texto, y la bandeja quedaba vacía o mostraba lo ajeno. El
   * identificador de especialista no admite ese error.
   */
  it('el especialista ve sólo las solicitudes de sus propias visitas', () => {
    const actor = usuario({ role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1' });
    const bandeja = [
      solicitud({ id: 'mia', visit: visita({ monitorId: 'esp-1' }) }),
      solicitud({ id: 'ajena', visit: visita({ monitorId: 'esp-9' }) }),
    ];

    expect(solicitudesVisibles(bandeja, actor).map((s) => s.id)).toEqual(['mia']);
  });

  it('sin identificador de especialista no ve ninguna, en vez de verlas todas', () => {
    const actor = usuario({ role: RoleCode.ESPECIALISTA });
    expect(solicitudesVisibles([solicitud()], actor)).toEqual([]);
  });

  it.each([[RoleCode.COORDINADOR_PEDAGOGICO], [RoleCode.JEFE_TALLER]])(
    '%s también ve sólo lo suyo',
    (rol) => {
      const actor = usuario({ role: rol, especialistaId: 'esp-1' });
      const bandeja = [solicitud({ visit: visita({ monitorId: 'esp-9' }) })];
      expect(solicitudesVisibles(bandeja, actor)).toEqual([]);
    },
  );
});

describe('solicitudesVisibles — quien decide', () => {
  it('el jefe de gestión ve lo nacido en la UGEL y no lo nacido en la I.E.', () => {
    const actor = usuario({ role: RoleCode.JEFE_GESTION });
    const bandeja = [
      solicitud({ id: 'ugel', solicitanteRolAlCrear: RoleCode.ESPECIALISTA }),
      solicitud({ id: 'ie', solicitanteRolAlCrear: RoleCode.COORDINADOR_PEDAGOGICO }),
    ];

    expect(solicitudesVisibles(bandeja, actor).map((s) => s.id)).toEqual(['ugel']);
  });

  it('el jefe de área queda acotado a su nivel educativo', () => {
    const actor = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' });
    const bandeja = [
      solicitud({ id: 'suyo', visit: visita({ nivel: 'Primaria' }) }),
      solicitud({ id: 'ajeno', visit: visita({ nivel: NivelEducativoEBR.SECUNDARIA }) }),
    ];

    expect(solicitudesVisibles(bandeja, actor).map((s) => s.id)).toEqual(['suyo']);
  });

  it('el director ve lo nacido en su colegio', () => {
    const actor = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });
    const bandeja = [
      solicitud({
        id: 'suyo',
        solicitanteRolAlCrear: RoleCode.COORDINADOR_PEDAGOGICO,
        visit: visita({ institucionId: 'ie-1' }),
      }),
      solicitud({
        id: 'ajeno',
        solicitanteRolAlCrear: RoleCode.COORDINADOR_PEDAGOGICO,
        visit: visita({ institucionId: 'ie-2' }),
      }),
    ];

    expect(solicitudesVisibles(bandeja, actor).map((s) => s.id)).toEqual(['suyo']);
  });

  /**
   * `puedeDecidirReprogramacion` restringe al director a Secundaria, que es
   * donde existen los cargos que pueden solicitar. La bandeja no aplicaba esa
   * restricción y le mostraba solicitudes sobre las que el botón decía «Ver
   * Trazabilidad»: dos pantallas discrepando sobre lo mismo.
   */
  it('al director no le llegan solicitudes fuera de Secundaria', () => {
    const actor = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });
    const bandeja = [
      solicitud({
        solicitanteRolAlCrear: RoleCode.COORDINADOR_PEDAGOGICO,
        visit: visita({ institucionId: 'ie-1', nivel: 'Primaria' }),
      }),
    ];

    expect(solicitudesVisibles(bandeja, actor)).toEqual([]);
  });

  it('un rol sin competencia sobre reprogramaciones no ve ninguna', () => {
    expect(solicitudesVisibles([solicitud()], usuario({ role: RoleCode.DOCENTE }))).toEqual([]);
  });

  it('sin usuario no ve ninguna', () => {
    expect(solicitudesVisibles([solicitud()], null)).toEqual([]);
  });
});

describe('solicitudesVisibles — filtro de estado', () => {
  const actor = usuario({ role: RoleCode.JEFE_GESTION });
  const bandeja = [
    solicitud({ id: 'p', estado: 'PENDIENTE' }),
    solicitud({ id: 'a', estado: 'APROBADO' }),
    solicitud({ id: 'r', estado: 'RECHAZADO' }),
  ];

  it('«Todos» no descarta ninguna', () => {
    expect(solicitudesVisibles(bandeja, actor, TODOS_LOS_ESTADOS)).toHaveLength(3);
  });

  it.each(ESTADOS_DE_SOLICITUD)('deja sólo las de estado %s', (estado) => {
    const visibles = solicitudesVisibles(bandeja, actor, estado);
    expect(visibles.every((s) => s.estado === estado)).toBe(true);
    expect(visibles).toHaveLength(1);
  });
});

describe('visitasReprogramables', () => {
  it('son las visitas propias que siguen programadas', () => {
    const actor = usuario({ role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1' });
    const visitas = [
      visita({ id: 'propia-programada', monitorId: 'esp-1', estado: 'PROGRAMADO' }),
      visita({ id: 'propia-realizada', monitorId: 'esp-1', estado: 'REALIZADO' }),
      visita({ id: 'ajena', monitorId: 'esp-9', estado: 'PROGRAMADO' }),
    ];

    expect(visitasReprogramables(visitas, actor).map((v) => v.id)).toEqual(['propia-programada']);
  });

  it('sin identificador de especialista no hay ninguna', () => {
    expect(visitasReprogramables([visita()], usuario({ role: RoleCode.ESPECIALISTA }))).toEqual([]);
  });

  it('sin usuario no hay ninguna', () => {
    expect(visitasReprogramables([visita()], null)).toEqual([]);
  });
});
