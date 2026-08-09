import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { EspecialistaRepository, CargoRecord } from './especialista.repository.js';
import type {
  IEspecialistaResponse,
  ICreateEspecialistaRequest,
  IUpdateEspecialistaRequest,
  IQueryEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';
import {
  findAll,
  findById,
  findUserIdByEspecialistaId,
  findCargosByEspecialistaId,
  findCargoById,
  countActiveCargos,
} from './especialista-read.helper.js';
import { create } from './especialista-create.helper.js';
import { update } from './especialista-update.helper.js';
import {
  deleteEspecialista,
  activate,
  deactivate,
  retirarCargo,
} from './especialista-delete.helper.js';
import { createCargo, finalizeCargo } from './especialista-cargo.helper.js';
import { transicionDocenteAEspecialista } from './transicion-rol.helper.js';
import { relevarDelCargo } from '../../superuser/relevar-del-cargo.helper.js';

@Injectable()
export class PrismaEspecialistaRepository implements EspecialistaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async relevarDelCargo(roleCode: string, exceptoPersonaId: string): Promise<number> {
    const rolDelCargo = await this.prisma.role.findUnique({ where: { codigo: roleCode } });
    if (!rolDelCargo) return 0;

    const salientes = await this.prisma.usuario.findMany({
      where: { rolId: rolDelCargo.id, personaId: { not: exceptoPersonaId } },
      select: { id: true, rolPrevio: true },
    });

    // Uno por uno y no con `updateMany`: cada saliente vuelve al rol del que
    // vino, y a quien no vino de ninguno se lo da de baja.
    for (const saliente of salientes) {
      await relevarDelCargo(this.prisma, saliente);
    }

    return salientes.length;
  }

  async findAll(filters?: IQueryEspecialistaRequest): Promise<IEspecialistaResponse[]> {
    return findAll(this.prisma, filters);
  }

  async findById(id: string): Promise<IEspecialistaResponse | null> {
    return findById(this.prisma, id);
  }

  async create(
    data: ICreateEspecialistaRequest,
    passwordHash: string,
    roleId: string,
  ): Promise<IEspecialistaResponse> {
    return create(this.prisma, data, passwordHash, roleId);
  }

  async update(
    id: string,
    data: IUpdateEspecialistaRequest,
    roleId?: string,
  ): Promise<IEspecialistaResponse> {
    return update(this.prisma, id, data, roleId);
  }

  async delete(id: string): Promise<IEspecialistaResponse> {
    return deleteEspecialista(this.prisma, id);
  }

  async activate(id: string): Promise<IEspecialistaResponse> {
    return activate(this.prisma, id);
  }

  async deactivate(id: string): Promise<IEspecialistaResponse> {
    return deactivate(this.prisma, id);
  }

  async retirarCargo(id: string): Promise<IEspecialistaResponse> {
    return retirarCargo(this.prisma, id);
  }

  async findUserIdByEspecialistaId(especialistaId: string): Promise<string | null> {
    return findUserIdByEspecialistaId(this.prisma, especialistaId);
  }

  async findCargosByEspecialistaId(especialistaId: string): Promise<CargoRecord[]> {
    return findCargosByEspecialistaId(this.prisma, especialistaId);
  }

  async findCargoById(id: string): Promise<CargoRecord | null> {
    return findCargoById(this.prisma, id);
  }

  async countActiveCargos(especialistaId: string): Promise<number> {
    return countActiveCargos(this.prisma, especialistaId);
  }

  async createCargo(
    especialistaId: string,
    cargo: string,
    fechaInicio: Date,
  ): Promise<CargoRecord> {
    return createCargo(this.prisma, especialistaId, cargo, fechaInicio);
  }

  async finalizeCargo(
    especialistaId: string,
    cargoId: string,
    fechaFin: Date,
    cargoValue: string,
  ): Promise<void> {
    return finalizeCargo(this.prisma, especialistaId, cargoId, fechaFin, cargoValue);
  }

  async transicionDocenteAEspecialista(
    personaId: string,
    data: ICreateEspecialistaRequest,
    roleId: string,
  ): Promise<IEspecialistaResponse> {
    return transicionDocenteAEspecialista(this.prisma, personaId, data, roleId);
  }
}
