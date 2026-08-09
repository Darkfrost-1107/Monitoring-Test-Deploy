import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { EspecialistaRepository } from '../repositories/especialista.repository.js';
import { CreateEspecialistaDto } from '../dto/create-especialista.dto.js';
import { UpdateEspecialistaDto } from '../dto/update-especialista.dto.js';
import { QueryEspecialistaDto } from '../dto/query-especialista.dto.js';
import type { IEspecialistaResponse } from '@sistema-monitoreo/shared-contracts';
import { CargoEspecialista } from '@sistema-monitoreo/shared-contracts';
import { CatalogsRepository } from '../../catalogs/repositories/catalogs.repository.js';
import { SessionRepository } from '../../auth/repositories/session.repository.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';
import { CondicionLaboral } from '../../../common/enums/condicion-laboral.enum.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { JwtPayload } from '../../auth/services/auth-token.service.js';

@Injectable()
export class EspecialistaService {
  constructor(
    private readonly repository: EspecialistaRepository,
    private readonly catalogsRepository: CatalogsRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Deja un solo ocupante en los cargos que admiten uno solo.
   *
   * Director de UGEL y Jefe de Gestión son únicos. El panel del superusuario ya
   * relevaba al anterior al **designar**, dentro de una transacción; el alta de
   * una persona nueva no, y quedaban dos a la vez.
   *
   * Se releva **después** de crear y no antes: si el alta falla, el que estaba
   * conserva su cargo. Al revés, un fallo dejaría el puesto vacante.
   */
  private async relevarAlAnteriorSiElCargoEsUnico(
    rolCode: string,
    nuevaPersonaId: string,
  ): Promise<void> {
    const esCargoUnico = rolCode === RoleCode.DIRECTOR_UGEL || rolCode === RoleCode.JEFE_GESTION;

    if (!esCargoUnico) return;

    await this.repository.relevarDelCargo(rolCode, nuevaPersonaId);
  }

  async findAll(filters?: QueryEspecialistaDto): Promise<IEspecialistaResponse[]> {
    return this.repository.findAll(filters);
  }

  async findById(id: string): Promise<IEspecialistaResponse | null> {
    return this.repository.findById(id);
  }

  async create(
    dto: CreateEspecialistaDto,
    currentUser: JwtPayload,
  ): Promise<IEspecialistaResponse> {
    // ── Regla 1: Solo Director UGEL o Jefe de Área pueden crear Jefes de Gestión
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION) {
      if (
        currentUser.role !== RoleCode.DIRECTOR_UGEL &&
        currentUser.role !== RoleCode.JEFE_AREA &&
        currentUser.role !== RoleCode.SUPERUSUARIO
      ) {
        throw new ForbiddenException(
          'No tiene privilegios suficientes para crear un perfil de Jefe de Gestión.',
        );
      }
    }

    // ── Regla 2: Jefe de Gestión → condicion_laboral obligatoriamente Nombrado
    if (
      (dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION &&
      (dto.condicionLaboral as CondicionLaboral) !== CondicionLaboral.NOMBRADO
    ) {
      throw new BadRequestException(
        'La condición laboral de un Jefe de Gestión debe ser exactamente Nombrado.',
      );
    }

    // ── Regla 2b: sólo el Jefe de Gestión puede ser Nombrado ──────────────────
    // El validador del DTO aceptaba antes únicamente Encargado, Destacado y
    // Designado, de modo que esta restricción viajaba implícita en él. Al
    // ampliarlo para que la Regla 2 fuera satisfacible, pasa a declararse acá.
    if (
      (dto.cargo as CargoNombre) !== CargoNombre.JEFE_GESTION &&
      (dto.condicionLaboral as CondicionLaboral) === CondicionLaboral.NOMBRADO
    ) {
      throw new BadRequestException(
        'Sólo un Jefe de Gestión puede registrarse con condición laboral Nombrado.',
      );
    }

    // ── Regla 3: Jefe de Área → carga_laboral obligatoriamente 40 horas
    if (
      (dto.cargo as CargoNombre) === CargoNombre.JEFE_AREA &&
      dto.cargaLaboral !== undefined &&
      dto.cargaLaboral !== 40
    ) {
      throw new BadRequestException(
        'La carga laboral de un Jefe de Área debe ser exactamente 40 horas.',
      );
    }

    // ── Regla 4: Especialista → la especialidad es obligatoria en Secundaria
    const isEsp = (dto.cargo as CargoNombre) === CargoNombre.ESPECIALISTA;
    if (isEsp && dto.nivelEducativo === 'Secundaria') {
      const mainSp = dto.especialidad?.trim();
      const hasLegacySp = dto.especialidades && dto.especialidades.length > 0;
      if (!mainSp && !hasLegacySp) {
        throw new BadRequestException(
          'Para un Especialista de nivel Secundaria, la especialidad es obligatoria.',
        );
      }
    }

    // ── Regla 5: Especialista → especialidad en Primaria (PIP o Educación Física si se define)
    if (isEsp && dto.nivelEducativo === 'Primaria') {
      const mainSp = dto.especialidad?.trim();
      const legacySp =
        dto.especialidades && dto.especialidades.length > 0
          ? dto.especialidades[0]?.trim()
          : undefined;
      const sp = mainSp || legacySp;
      if (sp && sp !== 'PIP' && sp !== 'Educación Física' && sp !== 'Educacion Fisica') {
        throw new BadRequestException(
          'Para un Especialista de nivel Primaria, la especialidad debe ser PIP o Educación Física si se define.',
        );
      }
    }

    const role = await this.catalogsRepository.findRoleByCode(dto.rolCode);
    if (!role) {
      throw new NotFoundException(`El rol ${dto.rolCode} no existe.`);
    }

    // Para Jefe de Gestión, la condicion se normaliza siempre a Nombrado
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION) {
      dto.condicionLaboral = CondicionLaboral.NOMBRADO;
    }

    // Para Jefe de Área, carga_laboral siempre se normaliza a 40
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_AREA) {
      dto.cargaLaboral = 40;
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS') ?? 12;
    const passwordHash = await bcrypt.hash(dto.dni, saltRounds);
    const creado = await this.repository.create(dto, passwordHash, role.id);

    // El alta también designa: Director de UGEL y Jefe de Gestión son cargos
    // únicos, y sin esto quedaban dos a la vez.
    await this.relevarAlAnteriorSiElCargoEsUnico(dto.rolCode, creado.personaId);

    return creado;
  }

  async update(
    id: string,
    dto: UpdateEspecialistaDto,
    currentUser: JwtPayload,
  ): Promise<IEspecialistaResponse> {
    // ── Regla 1: Solo Director UGEL o Jefe de Área pueden modificar Jefes de Gestión
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION) {
      if (
        currentUser.role !== RoleCode.DIRECTOR_UGEL &&
        currentUser.role !== RoleCode.JEFE_AREA &&
        currentUser.role !== RoleCode.SUPERUSUARIO
      ) {
        throw new ForbiddenException(
          'No tiene privilegios suficientes para actualizar un perfil de Jefe de Gestión.',
        );
      }
    }

    // ── Regla 2: Jefe de Gestión → condicion_laboral obligatoriamente Nombrado
    if (
      (dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION &&
      (dto.condicionLaboral as CondicionLaboral) !== CondicionLaboral.NOMBRADO
    ) {
      throw new BadRequestException(
        'La condición laboral de un Jefe de Gestión debe ser exactamente Nombrado.',
      );
    }

    // ── Regla 2b: sólo el Jefe de Gestión puede ser Nombrado ──────────────────
    // El validador del DTO aceptaba antes únicamente Encargado, Destacado y
    // Designado, de modo que esta restricción viajaba implícita en él. Al
    // ampliarlo para que la Regla 2 fuera satisfacible, pasa a declararse acá.
    if (
      (dto.cargo as CargoNombre) !== CargoNombre.JEFE_GESTION &&
      (dto.condicionLaboral as CondicionLaboral) === CondicionLaboral.NOMBRADO
    ) {
      throw new BadRequestException(
        'Sólo un Jefe de Gestión puede registrarse con condición laboral Nombrado.',
      );
    }

    // ── Regla 3: Jefe de Área → carga_laboral obligatoriamente 40 horas
    if (
      (dto.cargo as CargoNombre) === CargoNombre.JEFE_AREA &&
      dto.cargaLaboral !== undefined &&
      dto.cargaLaboral !== 40
    ) {
      throw new BadRequestException(
        'La carga laboral de un Jefe de Área debe ser exactamente 40 horas.',
      );
    }

    // ── Regla 4: Especialista → la especialidad es obligatoria en Secundaria
    const isEspUpdate = (dto.cargo as CargoNombre) === CargoNombre.ESPECIALISTA;
    if (isEspUpdate && dto.nivelEducativo === 'Secundaria') {
      const mainSp = dto.especialidad?.trim();
      const hasLegacySp = dto.especialidades && dto.especialidades.length > 0;
      if (!mainSp && !hasLegacySp) {
        throw new BadRequestException(
          'Para un Especialista de nivel Secundaria, la especialidad es obligatoria.',
        );
      }
    }

    // ── Regla 5: Especialista → especialidad en Primaria (PIP o Educación Física si se define)
    if (isEspUpdate && dto.nivelEducativo === 'Primaria') {
      const mainSp = dto.especialidad?.trim();
      const legacySp =
        dto.especialidades && dto.especialidades.length > 0
          ? dto.especialidades[0]?.trim()
          : undefined;
      const sp = mainSp || legacySp;
      if (sp && sp !== 'PIP' && sp !== 'Educación Física' && sp !== 'Educacion Fisica') {
        throw new BadRequestException(
          'Para un Especialista de nivel Primaria, la especialidad debe ser PIP o Educación Física si se define.',
        );
      }
    }

    // Para Jefe de Gestión normalizar condicion
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION) {
      dto.condicionLaboral = CondicionLaboral.NOMBRADO;
    }

    // Para Jefe de Área normalizar carga horaria
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_AREA) {
      dto.cargaLaboral = 40;
    }

    let roleId: string | undefined;
    if (dto.rolCode) {
      const role = await this.catalogsRepository.findRoleByCode(dto.rolCode);
      if (!role) {
        throw new NotFoundException(`El rol ${dto.rolCode} no existe.`);
      }
      roleId = role.id;
    }
    return this.repository.update(id, dto, roleId);
  }

  async delete(id: string): Promise<IEspecialistaResponse> {
    return this.repository.delete(id);
  }

  async activate(id: string): Promise<IEspecialistaResponse> {
    const result = await this.repository.activate(id);
    // No invalidamos sesión: activate es idempotente y no cambia rol/cargo.
    return result;
  }

  async deactivate(id: string): Promise<IEspecialistaResponse> {
    const result = await this.repository.deactivate(id);
    return result;
  }

  async transicionRolAEspecialista(
    personaId: string,
    dto: CreateEspecialistaDto,
    currentUser: JwtPayload,
  ): Promise<IEspecialistaResponse> {
    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_GESTION) {
      if (
        currentUser.role !== RoleCode.DIRECTOR_UGEL &&
        currentUser.role !== RoleCode.JEFE_AREA &&
        currentUser.role !== RoleCode.SUPERUSUARIO
      ) {
        throw new ForbiddenException(
          'No tiene privilegios suficientes para crear un perfil de Jefe de Gestión.',
        );
      }
      dto.condicionLaboral = CondicionLaboral.NOMBRADO;
    }

    if ((dto.cargo as CargoNombre) === CargoNombre.JEFE_AREA) {
      dto.cargaLaboral = 40;
    }

    const isEsp = (dto.cargo as CargoNombre) === CargoNombre.ESPECIALISTA;
    if (isEsp && dto.nivelEducativo === 'Secundaria') {
      const mainSp = dto.especialidad?.trim();
      const hasLegacySp = dto.especialidades && dto.especialidades.length > 0;
      if (!mainSp && !hasLegacySp) {
        throw new BadRequestException(
          'Para un Especialista de nivel Secundaria, la especialidad es obligatoria.',
        );
      }
    }
    if (isEsp && dto.nivelEducativo === 'Primaria') {
      const mainSp = dto.especialidad?.trim();
      const legacySp =
        dto.especialidades && dto.especialidades.length > 0
          ? dto.especialidades[0]?.trim()
          : undefined;
      const sp = mainSp || legacySp;
      if (sp && sp !== 'PIP' && sp !== 'Educación Física' && sp !== 'Educacion Fisica') {
        throw new BadRequestException(
          'Para un Especialista de nivel Primaria, la especialidad debe ser PIP o Educación Física si se define.',
        );
      }
    }

    const role = await this.catalogsRepository.findRoleByCode(dto.rolCode);
    if (!role) {
      throw new NotFoundException(`El rol ${dto.rolCode} no existe.`);
    }

    return this.repository.transicionDocenteAEspecialista(personaId, dto, role.id);
  }
}

// Re-export constant for backward compatibility (replaces old CargoNombre.JEFE_AREA usages)
export { CargoEspecialista };
