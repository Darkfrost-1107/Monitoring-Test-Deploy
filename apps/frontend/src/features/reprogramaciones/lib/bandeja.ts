import { MONITOR_CAMPO_ROLES } from '@sistema-monitoreo/shared-contracts';
import {
  puedeDecidirReprogramacion,
  type UsuarioDecisor,
  type VisitaDecidible,
} from '@entities/model-reprogramaciones';

/**
 * Qué solicitudes de reprogramación ve cada quien en su bandeja.
 *
 * Eran dos `useMemo` dentro de `BandejaReprogramaciones`. El segundo
 * reimplementaba en paralelo el enrutamiento que `puedeDecidirReprogramacion`
 * ya resolvía, y con una diferencia: al director de institución no le aplicaba
 * la restricción a Secundaria, así que la bandeja le mostraba solicitudes que
 * la otra regla declaraba fuera de su alcance.
 *
 * La bandeja no es un control de acceso: el backend acota las solicitudes en
 * `visit-requests.service.ts` y exige `monitoreo:execute` para resolverlas. Acá
 * se decide qué tiene sentido poner delante de cada quien.
 */

export const ESTADOS_DE_SOLICITUD = ['PENDIENTE', 'APROBADO', 'RECHAZADO'] as const;

export type EstadoDeSolicitud = (typeof ESTADOS_DE_SOLICITUD)[number];

/** Valor con el que el filtro de estado se declara inactivo. */
export const TODOS_LOS_ESTADOS = 'Todos';

export type FiltroDeEstado = EstadoDeSolicitud | typeof TODOS_LOS_ESTADOS;

/** Lo que la bandeja necesita de una visita. */
export interface VisitaDeBandeja extends VisitaDecidible {
  id: string;
  /** Identificador del especialista asignado. */
  monitorId: string;
  estado: string;
}

/** Lo que la bandeja necesita de una solicitud. */
export interface SolicitudDeBandeja {
  id: string;
  estado: EstadoDeSolicitud;
  /** Marca temporal del registro; ordena la bandeja. */
  fechaRegistro: string;
  solicitanteRolAlCrear?: string;
}

export type SolicitudEnBandeja<V extends VisitaDeBandeja = VisitaDeBandeja> =
  SolicitudDeBandeja & { visit: V };

/** Lo que la bandeja necesita del usuario. */
export interface UsuarioDeBandeja extends UsuarioDecisor {
  /** Identificador del especialista vinculado; con él se reconocen las visitas propias. */
  especialistaId?: string;
}

/** ¿El usuario es de los que solicitan reprogramaciones en vez de resolverlas? */
const solicita = (usuario: UsuarioDeBandeja): boolean =>
  (MONITOR_CAMPO_ROLES as readonly string[]).includes(usuario.role);

/** ¿La visita está asignada a este usuario? */
const esSuya = (usuario: UsuarioDeBandeja, visita: VisitaDeBandeja): boolean =>
  !!usuario.especialistaId && usuario.especialistaId === visita.monitorId;

/**
 * Cruza las visitas con sus solicitudes, de la más reciente a la más antigua.
 *
 * Una visita sin solicitud no entra: la bandeja lista solicitudes, no visitas.
 */
export function armarBandeja<V extends VisitaDeBandeja, S extends SolicitudDeBandeja>(
  visitas: readonly V[],
  porVisita: Readonly<Record<string, S>>,
): (S & { visit: V })[] {
  const bandeja: (S & { visit: V })[] = [];

  for (const visita of visitas) {
    const solicitud = porVisita[visita.id];
    if (solicitud) bandeja.push({ ...solicitud, visit: visita });
  }

  return bandeja.sort(
    (a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime(),
  );
}

/**
 * Solicitudes que le corresponden al usuario, con el filtro de estado puesto.
 *
 * Quien solicita ve las suyas —reconocidas por identificador de especialista, no
 * por nombre—; quien resuelve ve exactamente aquello sobre lo que puede
 * decidir, que es la misma regla que habilita los botones.
 */
export function solicitudesVisibles<S extends SolicitudEnBandeja>(
  bandeja: readonly S[],
  usuario: UsuarioDeBandeja | null | undefined,
  estado: FiltroDeEstado = TODOS_LOS_ESTADOS,
): S[] {
  if (!usuario) return [];

  const propias = solicita(usuario);

  return bandeja.filter((solicitud) => {
    if (estado !== TODOS_LOS_ESTADOS && solicitud.estado !== estado) return false;

    return propias
      ? esSuya(usuario, solicitud.visit)
      : puedeDecidirReprogramacion(usuario, solicitud.visit, solicitud.solicitanteRolAlCrear);
  });
}

/**
 * Visitas propias que todavía se pueden reprogramar.
 *
 * Una visita ya realizada o cancelada no admite cambio de fecha: pedirlo sería
 * pedir que se mueva algo que ya ocurrió.
 */
export function visitasReprogramables<V extends VisitaDeBandeja>(
  visitas: readonly V[],
  usuario: UsuarioDeBandeja | null | undefined,
): V[] {
  if (!usuario) return [];

  return visitas.filter((v) => v.estado === 'PROGRAMADO' && esSuya(usuario, v));
}
