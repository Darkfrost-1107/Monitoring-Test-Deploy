import type { IPlantilla, RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import type { CreatePlantillaDto } from '../dto/create-plantilla.dto.js';
import type { UpdatePlantillaDto } from '../dto/update-plantilla.dto.js';

export interface CreatePlantillaData {
  autorId: string;
  rolAutorAlCrear: RolAutorPlantilla;
  institucionId: string | null;
  data: CreatePlantillaDto;
}

export interface UpdatePlantillaData {
  data: UpdatePlantillaDto;
}

export type ModoVersionado = 'IN_PLACE' | 'VERSIONADO';

export interface UpdatePlantillaResult {
  plantilla: IPlantilla;
  modo: ModoVersionado;
  mensaje: string;
}

export abstract class PlantillaRepository {
  abstract findAll(filters?: {
    search?: string;
    anioAcademico?: number;
    tipoMonitoreo?: import('@sistema-monitoreo/shared-contracts').TipoPlantilla;
    estado?: 'Borrador' | 'Vigente' | 'Historico';
    rolAutorAlCrear?: RolAutorPlantilla;
    institucionId?: string | null;
  }): Promise<IPlantilla[]>;

  abstract findById(id: string): Promise<IPlantilla | null>;

  abstract countFichasAsociadas(plantillaId: string): Promise<number>;

  abstract findFichasByPlantilla(
    plantillaId: string,
  ): Promise<{ id: string; evidenciaUrls: string[] }[]>;

  abstract create(data: CreatePlantillaData): Promise<IPlantilla>;

  abstract updateInPlace(plantillaId: string, data: UpdatePlantillaData): Promise<IPlantilla>;

  abstract versionarConClon(
    plantillaOriginalId: string,
    data: UpdatePlantillaData,
    nuevoAutorId: string,
  ): Promise<IPlantilla>;

  abstract updateEstado(
    id: string,
    estado: 'Borrador' | 'Vigente' | 'Historico',
  ): Promise<IPlantilla>;

  /**
   * Pone una plantilla en Vigente y archiva a las que lo estaban.
   *
   * Es un relevo, no dos cambios de estado: entre archivar la anterior y
   * activar la nueva, un fallo dejaría al año sin ninguna plantilla vigente y
   * ningún monitoreo podría programarse. Por eso va en una transacción.
   */
  abstract activarArchivando(id: string, idsAArchivar: string[]): Promise<IPlantilla>;

  abstract softDelete(id: string): Promise<IPlantilla>;

  abstract eliminarConCascade(id: string): Promise<{ id: string; deletedFichas: number }>;

  abstract clone(
    sourceId: string,
    nuevoAutorId: string,
    rolAutorAlCrear: RolAutorPlantilla,
    institucionId: string | null,
    descripcion?: string,
    anioAcademico?: number,
  ): Promise<IPlantilla>;
}
