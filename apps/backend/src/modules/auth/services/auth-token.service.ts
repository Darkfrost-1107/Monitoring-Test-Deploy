import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import { RoleCode, isRoleCode } from '../../../common/enums/role.enum.js';
import type { AuthUserWithRelations } from '../repositories/user.repository.js';
import {
  computeEffectivePermissions,
  CargoNombre,
  EspecialistaCargoEnum,
} from '../../../shared/auth/capability-map.js';

export type { AuthUserWithRelations };

export interface JwtPayload {
  sub: string;
  dni: string;
  role: RoleCode;
  permissions?: string[];
  nombres: string;
  apellidos: string;
  institucion_id?: string;
  colegio_id?: string;
  colegio_nombre?: string;
  colegio_nivel?: string;
  especialista_id?: string;
  especialista_nivel?: string;
  especialista_modalidad?: string;
  especialista_especialidades?: string[];
  firstLogin: boolean;
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  generateTokens(
    payload: JwtPayload,
    sessionJti: string,
  ): {
    accessToken: string;
    refreshTokenJWT: string;
    refreshExpiresAt: Date;
  } {
    const accessOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ??
        '15m') as JwtSignOptions['expiresIn'],
      jwtid: sessionJti,
    };
    const accessToken = this.jwtService.sign(
      payload as unknown as Record<string, unknown>,
      accessOpts,
    );

    const rawRefreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');

    const refreshOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
        '7d') as JwtSignOptions['expiresIn'],
    };
    const refreshTokenJWT = this.jwtService.sign(
      { jti: sessionJti, sub: payload.sub, tokenHash: refreshTokenHash },
      refreshOpts,
    );

    const decodedRefresh = this.jwtService.decode<{ exp: number }>(refreshTokenJWT);
    const refreshExpiresAt = new Date(decodedRefresh.exp * 1000);

    return { accessToken, refreshTokenJWT, refreshExpiresAt };
  }

  verifyRefreshToken(token: string): { jti: string; sub: string; tokenHash: string; exp: number } {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') as string,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  buildJwtPayload(user: AuthUserWithRelations): JwtPayload {
    let institucion_id: string | undefined;
    let colegio_id: string | undefined;
    let colegio_nombre: string | undefined;
    let colegio_nivel: string | undefined;

    if (user.persona?.docente) {
      colegio_id = user.persona.docente.institucionId || undefined;
      institucion_id = user.persona.docente.institucionId || undefined;
      colegio_nombre = user.persona.docente.institucion?.nombre;
      colegio_nivel = user.persona.docente.institucion?.nivelEducativo;
    }

    let especialista_id: string | undefined;
    let especialista_nivel: string | undefined;
    let especialista_modalidad: string | undefined;
    let especialista_especialidades: string[] | undefined;

    if (user.persona?.especialista) {
      especialista_id = user.persona.especialista.id;
      especialista_nivel = user.persona.especialista.nivelEducativo;
      especialista_modalidad = user.persona.especialista.modalidad ?? undefined;
      if (user.persona.especialista.especialidades) {
        especialista_especialidades = user.persona.especialista.especialidades.map(
          (e) => e.especialidad.nombre,
        );
      }
    }

    const permissions = this.computeUserPermissions(user);

    return {
      sub: user.id,
      dni: user.persona.dni,
      role: this.resolveRoleCode(user),
      permissions,
      nombres: user.persona.nombres,
      apellidos: user.persona.apellidos,
      institucion_id,
      colegio_id,
      colegio_nombre,
      colegio_nivel,
      especialista_id,
      especialista_nivel,
      especialista_modalidad,
      especialista_especialidades,
      firstLogin: user.isFirstLogin,
    };
  }

  /**
   * Calcula las capabilities efectivas del usuario:
   *   BASE_CAPABILITIES ∪ ROL_CAPABILITIES[rol]
   *   ∪ ESPECIALISTA_CARGO_CAPABILITIES[especialista.cargo] (si tiene)
   *   ∪ ∪ DOCENTE_CARGO_CAPABILITIES[cargo] por cada cargo activo
   *
   * Reemplaza la lectura directa de `rol_permisos` por el modelo
   * capability-based (Fase 1.6). El resultado es la UNION de las 3 fuentes.
   */
  /**
   * Convierte `Role.codigo` —columna de texto libre— en un `RoleCode` conocido.
   *
   * Antes se resolvía con una asercion de tipo sin comprobar. Un codigo ausente
   * del contrato producia un usuario con cero capabilities y una carga util que
   * el esquema del frontend rechazaba al parsear: dos fallos tardios y opacos en
   * lugar de uno inmediato y legible. Un codigo desconocido es un defecto de
   * integridad de datos y debe manifestarse como tal.
   */
  private resolveRoleCode(user: AuthUserWithRelations): RoleCode {
    const codigo = user.rol.codigo;
    if (!isRoleCode(codigo)) {
      throw new UnauthorizedException(
        `El rol '${codigo}' no pertenece al contrato de roles del sistema.`,
      );
    }
    return codigo;
  }

  private computeUserPermissions(user: AuthUserWithRelations): string[] {
    const rolCodigo = this.resolveRoleCode(user);

    // Fase 2: el cargo del Especialista ahora vive en la tabla `especialista_cargos`.
    // El `buildInclude()` ya hace `take: 1` con orderBy por fechaInicio desc
    // y filtra por es_principal = true + fecha_fin IS NULL, asi que el primer
    // elemento (si existe) es el cargo activo y principal.
    const espCargoActual = user.persona?.especialista?.cargos?.[0]?.cargo ?? null;
    const espCargo = (espCargoActual ?? null) as EspecialistaCargoEnum | null;

    const activeDocenteCargos: CargoNombre[] = (user.persona?.docente?.docenteCargos ?? [])
      .filter((dc) => dc.cargo?.nombre)
      .map((dc) => dc.cargo.nombre as CargoNombre);

    return computeEffectivePermissions(rolCodigo, espCargo, activeDocenteCargos);
  }
}
