import type { Prisma } from '../../../generated/prisma/client.js';

/**
 * Usuario con las relaciones que la autenticación necesita cargadas.
 *
 * Fase 4 de PLAN_REMEDIACION.md. La interfaz declaraba devolver la entidad
 * `Usuario`, un modelo escrito a mano cuyos campos `persona` y `rol` no
 * describen las relaciones anidadas que el repositorio carga de verdad. El
 * desajuste estaba tapado por un `as any` sobre el `include` de Prisma: al
 * retirarlo, el compilador señaló que lo devuelto no es asignable a `Usuario`.
 *
 * El tipo se declara **aquí**, junto al contrato del repositorio, y no en el
 * servicio que lo consume: es el repositorio quien decide qué devuelve. Antes
 * vivía en `auth-token.service.ts`, con el consumidor describiendo la forma de
 * su proveedor.
 */
export type AuthUserWithRelations = Prisma.UsuarioGetPayload<{
  include: {
    // `rolPermisos` se cargaba aquí para derivar los permisos leyendo la tabla
    // `rol_permisos`. Desde que `computeEffectivePermissions` los calcula con el
    // mapa de capacidades, nadie leía el valor: era un join en cada
    // autenticación cuyo resultado se descartaba. H-25 de PLAN_REMEDIACION.md.
    rol: true;
    persona: {
      include: {
        docente: {
          include: {
            institucion: { include: { nivelEducativoRel: true } };
            docenteCargos: {
              where: { fechaFin: null };
              include: { cargo: true };
            };
            docenteEspecialidades: { include: { especialidad: true } };
          };
        };
        especialista: {
          include: {
            especialidades: { include: { especialidad: true } };
            cargos: {
              where: { fechaFin: null; esPrincipal: true };
              orderBy: { fechaInicio: 'desc' };
              take: 1;
            };
          };
        };
      };
    };
  };
}>;

/**
 * Usuario con sólo su rol y su persona.
 *
 * La recuperación de contraseña necesita comprobar identidad y enviar un correo:
 * no le hacen falta cargos, institución ni especialidades. Cargarlos sería un
 * join inútil en cada solicitud.
 *
 * Declararlo aparte es lo que el `as any` impedía ver: los tres buscadores del
 * repositorio devolvían formas distintas mientras la interfaz afirmaba que
 * devolvían la misma.
 */
export type AuthUserBasico = Prisma.UsuarioGetPayload<{
  include: { rol: true; persona: true };
}>;

export abstract class UserRepository {
  abstract findUserByDni(dni: string): Promise<AuthUserWithRelations | null>;
  abstract findUserById(id: string): Promise<AuthUserWithRelations | null>;
  abstract findUserByDniAndEmail(dni: string, email: string): Promise<AuthUserBasico | null>;
  abstract updateLastLogin(userId: string, now: Date): Promise<void>;
  abstract updatePassword(userId: string, passwordHash: string): Promise<void>;
  abstract incrementFailedAttempts(userId: string, now: Date): Promise<number>;
  abstract lockAccount(userId: string, until: Date): Promise<void>;
  abstract resetFailedAttempts(userId: string): Promise<void>;
}
