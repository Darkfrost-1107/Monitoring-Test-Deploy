import { CARGA_HORARIA } from '@shared/config/constants';
import { especialistasApi } from './especialistas.api.js';
import type {
  IEspecialistaResponse,
  IQueryEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';

export type IJefeAreaResponse = IEspecialistaResponse;
export type IQueryJefeAreaRequest = IQueryEspecialistaRequest;
export type ICreateJefeAreaRequest = Record<string, unknown>;
export type IUpdateJefeAreaRequest = Record<string, unknown>;

export const jefesAreaApi = {
  findAll: async (
    query?: IQueryJefeAreaRequest,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse[]; error?: unknown }> => {
    return especialistasApi.findAll({ ...query, cargo: 'Jefe de Área' });
  },

  findById: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse; error?: unknown }> => {
    return especialistasApi.findById(id);
  },

  create: async (
    dto: Record<string, unknown>,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse; error?: unknown }> => {
    const specialistDto = {
      dni: dto.dni as string,
      nombres: dto.nombres as string,
      apellidos: dto.apellidos as string,
      correo: dto.correo as string,
      telefono: dto.telefono as string,
      cargo: 'Jefe de Área',
      modalidad: 'EBR',
      nivelEducativo: (dto.nivelEducativo as string) || 'Secundaria',
      rolCode: (dto.rolCode as string) || 'jefe_area',
      condicionLaboral: (dto.condicionLaboral as string) || 'Designado',
      cargaLaboral: dto.cargaHoraria !== undefined ? Number(dto.cargaHoraria) : CARGA_HORARIA.JEFE_AREA,
    };
    return especialistasApi.create(specialistDto);
  },

  update: async (
    id: string,
    dto: Record<string, unknown>,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse; error?: unknown }> => {
    const specialistDto = {
      nombres: dto.nombres as string,
      apellidos: dto.apellidos as string,
      correo: dto.correo as string,
      telefono: dto.telefono as string,
      cargo: 'Jefe de Área',
      modalidad: 'EBR',
      nivelEducativo: (dto.nivelEducativo as string) || 'Secundaria',
      estado: (dto.estado as string) || 'Activo',
      rolCode: (dto.rolCode as string) || 'jefe_area',
      condicionLaboral: (dto.condicionLaboral as string) || 'Designado',
      cargaLaboral: dto.cargaHoraria !== undefined ? Number(dto.cargaHoraria) : CARGA_HORARIA.JEFE_AREA,
    };
    return especialistasApi.update(id, specialistDto);
  },

  delete: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse; error?: unknown }> => {
    return especialistasApi.delete(id);
  },

  /**
   * Retira el cargo de Jefe de Área. La persona vuelve a ser Especialista y
   * sigue activa: darla de baja es otra acción, la de esa sección.
   */
  deactivate: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse; error?: unknown }> => {
    return especialistasApi.retirarCargo(id);
  },

  activate: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IJefeAreaResponse; error?: unknown }> => {
    return especialistasApi.activate(id);
  },
};
