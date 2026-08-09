import type {
  IEspecialistaResponse,
  ICreateEspecialistaRequest,
  IUpdateEspecialistaRequest,
  IQueryEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';

export interface CargoRecord {
  id: string;
  cargo: string;
  especialistaId: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  esPrincipal: boolean;
}

export abstract class EspecialistaRepository {
  /**
   * Devuelve al rol de Especialista a quien ostentaba un cargo único.
   *
   * Director de UGEL y Jefe de Gestión son uno solo a la vez. El panel del
   * superusuario ya relevaba al anterior al **designar**, pero el alta de una
   * persona nueva asignaba el rol sin mirar si ya había alguien, y quedaban dos.
   *
   * Se excluye por `personaId` y no por el identificador del especialista: son
   * tablas distintas y el usuario cuelga de la persona. Confundirlos relevaría
   * también a quien acaba de asumir.
   *
   * @param exceptoPersonaId Persona que acaba de asumir, para no relevarla.
   * @returns Cuántos fueron relevados.
   */
  abstract relevarDelCargo(roleCode: string, exceptoPersonaId: string): Promise<number>;

  abstract findAll(filters?: IQueryEspecialistaRequest): Promise<IEspecialistaResponse[]>;
  abstract findById(id: string): Promise<IEspecialistaResponse | null>;
  abstract create(
    data: ICreateEspecialistaRequest,
    passwordHash: string,
    roleId: string,
  ): Promise<IEspecialistaResponse>;
  abstract update(
    id: string,
    data: IUpdateEspecialistaRequest,
    roleId?: string,
  ): Promise<IEspecialistaResponse>;
  abstract delete(id: string): Promise<IEspecialistaResponse>;
  abstract activate(id: string): Promise<IEspecialistaResponse>;
  abstract deactivate(id: string): Promise<IEspecialistaResponse>;
  abstract findUserIdByEspecialistaId(especialistaId: string): Promise<string | null>;
  abstract findCargosByEspecialistaId(especialistaId: string): Promise<CargoRecord[]>;
  abstract findCargoById(id: string): Promise<CargoRecord | null>;
  abstract countActiveCargos(especialistaId: string): Promise<number>;
  abstract createCargo(
    especialistaId: string,
    cargo: string,
    fechaInicio: Date,
  ): Promise<CargoRecord>;
  abstract finalizeCargo(
    especialistaId: string,
    cargoId: string,
    fechaFin: Date,
    cargoValue: string,
  ): Promise<void>;
  abstract transicionDocenteAEspecialista(
    personaId: string,
    data: ICreateEspecialistaRequest,
    roleId: string,
  ): Promise<IEspecialistaResponse>;
}
