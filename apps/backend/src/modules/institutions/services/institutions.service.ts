import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InstitutionsRepository } from '../repositories/institutions.repository.js';
import { CreateInstitucionDto } from '../dto/create-institucion.dto.js';
import { UpdateInstitucionDto } from '../dto/update-institucion.dto.js';
import { QueryInstitucionDto } from '../dto/query-institucion.dto.js';
import { Institucion } from '../entities/institucion.entity.js';
import { JwtPayload } from '../../auth/services/auth-token.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

@Injectable()
export class InstitutionsService {
  constructor(private readonly institutionsRepository: InstitutionsRepository) {}

  async create(dto: CreateInstitucionDto, user?: JwtPayload): Promise<Institucion> {
    if (user?.role === RoleCode.JEFE_AREA) {
      const jefeNivel = user.especialista_nivel;
      const targetMod = dto.modalidad || 'EBR';
      const targetNivel = dto.nivelEducativo;

      if (jefeNivel === 'Inicial') {
        const isValid = (targetMod === 'EBR' && targetNivel === 'Inicial') || targetMod === 'EBE';
        if (!isValid) {
          throw new ForbiddenException(
            'Un Responsable de Nivel de nivel Inicial solo puede crear instituciones de nivel Inicial (EBR) o de la modalidad Especial (EBE).',
          );
        }
      } else if (jefeNivel === 'Primaria') {
        const isValid = targetMod === 'EBR' && targetNivel === 'Primaria';
        if (!isValid) {
          throw new ForbiddenException(
            'Un Responsable de Nivel de nivel Primaria solo puede crear instituciones de nivel Primaria (EBR).',
          );
        }
      } else if (jefeNivel === 'Secundaria') {
        const isValid =
          (targetMod === 'EBR' && targetNivel === 'Secundaria') ||
          targetMod === 'EBA' ||
          targetMod === 'CEPTRO';
        if (!isValid) {
          throw new ForbiddenException(
            'Un Responsable de Nivel de nivel Secundaria solo puede crear instituciones de nivel Secundaria (EBR), Alternativa (EBA) o CEPTRO.',
          );
        }
      }
    }

    const existing = await this.institutionsRepository.findByCodigoModular(dto.codigoModular);
    if (existing) {
      throw new ConflictException(
        `La institución con código modular ${dto.codigoModular} ya existe en el sistema.`,
      );
    }
    return this.institutionsRepository.create(dto);
  }

  async findById(id: string): Promise<Institucion> {
    const record = await this.institutionsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Institución educativa con ID ${id} no encontrada.`);
    }
    return record;
  }

  async update(id: string, dto: UpdateInstitucionDto): Promise<Institucion> {
    await this.findById(id); // Valida existencia (lanza 404 si no existe)
    return this.institutionsRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<Institucion> {
    await this.findById(id); // Valida existencia (lanza 404 si no existe)
    return this.institutionsRepository.softDelete(id);
  }

  async restore(id: string): Promise<Institucion> {
    await this.findById(id); // Valida existencia (lanza 404 si no existe)
    return this.institutionsRepository.restore(id);
  }

  async findAll(
    query: QueryInstitucionDto,
    user?: JwtPayload,
  ): Promise<{ data: Institucion[]; total: number; limit: number; offset: number }> {
    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;

    const { data, total } = await this.institutionsRepository.findAll(
      {
        ...query,
        limit,
        offset,
      },
      user,
    );

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  async getDashboardStats(user?: JwtPayload) {
    return this.institutionsRepository.getDashboardStats(user);
  }
}
