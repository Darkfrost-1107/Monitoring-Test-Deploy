import { CargoNombre } from '../../../shared/auth/capability-map.js';

export interface DocenteCargoRow {
  id: string;
  docenteId: string;
  cargoId: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  esPrincipal: boolean;
  cargo: { id: string; nombre: string };
}

export interface DocentePersonaInfo {
  personaId: string;
  usuarioId: string | null;
  especialistaId: string | null;
}

export interface FinalizeCargoParams {
  docenteId: string;
  cargoId: string;
  fechaFin: Date;
  principalPromotionTargetId: string | null;
  roleUpdate: { usuarioId: string; roleCodigo: string } | null;
  especialistaUpdate: { especialistaId: string; cargo: string; estado: string } | null;
  monitorEspecialistaId: string | null;
  /**
   * Baja del docente al cerrarse su último cargo de monitoreo.
   *
   * Es lo que el diálogo de cese promete: «pasará a figurar como docente sin
   * institución asignada y su acceso al sistema será desactivado». Se cerraba el
   * cargo y se cambiaba el rol, pero el registro quedaba Activo y ligado a la
   * institución que ya no dirige.
   */
  docenteUpdate: { estado: string; institucionId: null } | null;
}

export abstract class DocentesCargosRepository {
  abstract findDocenteExistence(docenteId: string): Promise<boolean>;
  abstract findCargoByNombre(nombre: string): Promise<{ id: string; nombre: string } | null>;
  abstract findDocenteCargoWithCargo(id: string): Promise<DocenteCargoRow | null>;
  abstract findActiveDocenteCargosWithCargo(docenteId: string): Promise<DocenteCargoRow[]>;
  abstract findAllCargosByDocenteId(docenteId: string): Promise<DocenteCargoRow[]>;
  abstract findActiveCargoNombresByDocenteId(docenteId: string): Promise<CargoNombre[]>;
  abstract findDocentePersonaInfo(docenteId: string): Promise<DocentePersonaInfo | null>;
  abstract findUserIdByDocenteId(docenteId: string): Promise<string | null>;

  abstract addCargo(
    docenteId: string,
    cargoId: string,
    fechaInicio: Date,
    esPrincipal: boolean,
  ): Promise<DocenteCargoRow>;

  abstract finalizeCargo(params: FinalizeCargoParams): Promise<void>;
}
