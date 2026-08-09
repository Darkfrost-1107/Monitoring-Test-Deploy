import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CargoCompatibilityService } from './cargo-compatibility.service.js';
import { SessionRepository } from '../../auth/repositories/session.repository.js';
import { CargoNombre, resolvePrincipalCargo } from '../../../shared/auth/capability-map.js';
import { DocentesCargosRepository } from '../repositories/docentes-cargos.repository.js';

/**
 * Servicio de gestion de cargos del docente.
 *
 * Responsabilidades:
 *  - Listar cargos activos + historial.
 *  - Agregar un cargo respetando las reglas de coexistencia (via CargoCompatibilityService).
 *  - Finalizar un cargo (set fecha_fin) y recomputar el `es_principal` del docente.
 *
 * El `es_principal` se recalcula automaticamente en cada operacion de escritura
 * para mantener el invariant: max 1 cargo activo con es_principal = true.
 * El partial unique index `uq_docente_cargo_principal_activo` lo enforza en BD.
 */
@Injectable()
export class DocentesCargosService {
  constructor(
    private readonly docentesCargosRepository: DocentesCargosRepository,
    private readonly compatibility: CargoCompatibilityService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  /**
   * Lista todos los cargos del docente (activos + finalizados) ordenados por
   * fecha_inicio desc. Incluye el nombre del cargo y `es_principal` calculado.
   */
  async list(docenteId: string) {
    const exists = await this.docentesCargosRepository.findDocenteExistence(docenteId);
    if (!exists) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado.`);
    }
    const cargos = await this.docentesCargosRepository.findAllCargosByDocenteId(docenteId);
    return cargos.map((dc) => ({
      id: dc.id,
      cargoId: dc.cargoId,
      cargo: dc.cargo.nombre,
      fechaInicio: dc.fechaInicio,
      fechaFin: dc.fechaFin,
      esPrincipal: dc.esPrincipal,
    }));
  }

  /**
   * Agrega un cargo nuevo al docente. Valida coexistencia, recalcula
   * `es_principal` y devuelve el cargo creado.
   */
  async add(docenteId: string, cargoNombre: CargoNombre, fechaInicio?: Date) {
    // 1. Verificar que el docente existe.
    const exists = await this.docentesCargosRepository.findDocenteExistence(docenteId);
    if (!exists) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado.`);
    }

    // 2. Validar coexistencia via CargoCompatibilityService.
    await this.compatibility.ensureCanAddCargo(docenteId, cargoNombre);

    // 3. Buscar el cargoId en la tabla cargos (por nombre).
    const cargoRow = await this.docentesCargosRepository.findCargoByNombre(cargoNombre);
    if (!cargoRow) {
      throw new NotFoundException(`Cargo "${cargoNombre}" no existe en el catalogo.`);
    }

    // 4. Recalcular es_principal: incluir el nuevo y resolver.
    const activos = await this.docentesCargosRepository.findActiveDocenteCargosWithCargo(docenteId);
    const nombresActivos = activos
      .filter((dc) => dc.cargo?.nombre)
      .map((dc) => dc.cargo.nombre as CargoNombre);
    const todos = [...nombresActivos, cargoNombre];
    const principalNombre = resolvePrincipalCargo(todos);

    // 5. Crear el nuevo y ajustar es_principal de los activos (tx en repo).
    const inicio = fechaInicio ?? new Date();
    return this.docentesCargosRepository.addCargo(
      docenteId,
      cargoRow.id,
      inicio,
      principalNombre === cargoNombre,
    );
  }

  /**
   * Finaliza un cargo del docente (set fecha_fin). Recalcula `es_principal`
   * para que el siguiente cargo activo (si hay) tome el lugar, o ninguno
   * si era el unico.
   */
  async finalize(docenteId: string, docenteCargoId: string, fechaFin?: Date) {
    const dc = await this.docentesCargosRepository.findDocenteCargoWithCargo(docenteCargoId);
    if (!dc || dc.docenteId !== docenteId) {
      throw new NotFoundException(
        `DocenteCargo ${docenteCargoId} no encontrado para el docente ${docenteId}.`,
      );
    }
    if (dc.fechaFin !== null) {
      throw new ConflictException(
        `El cargo "${dc.cargo.nombre}" ya fue finalizado el ${dc.fechaFin.toISOString()}.`,
      );
    }

    const fin = fechaFin ?? new Date();

    // Calcular estado post-cierre con los datos actuales
    const restantes =
      await this.docentesCargosRepository.findActiveDocenteCargosWithCargo(docenteId);
    const postCloseCargos = restantes.filter((r) => r.id !== docenteCargoId);
    const postCloseNombres = postCloseCargos
      .filter((r) => r.cargo?.nombre)
      .map((r) => r.cargo.nombre as CargoNombre);

    // Resolver promocion de principal
    const nuevoPrincipal = resolvePrincipalCargo(postCloseNombres);
    const principalPromotionTargetId =
      dc.esPrincipal && nuevoPrincipal
        ? (postCloseCargos.find((r) => r.cargo?.nombre === nuevoPrincipal)?.id ?? null)
        : null;

    // Resolver side effects para cargos de monitor
    const MONITOR_CARGOS = ['Director', 'Coordinador Pedagógico', 'Jefe de Taller'];
    let roleUpdate: { usuarioId: string; roleCodigo: string } | null = null;
    let especialistaUpdate: { especialistaId: string; cargo: string; estado: string } | null = null;
    let monitorEspecialistaId: string | null = null;
    let docenteUpdate: { estado: string; institucionId: null } | null = null;

    if (MONITOR_CARGOS.includes(dc.cargo.nombre)) {
      const docenteInfo = await this.docentesCargosRepository.findDocentePersonaInfo(docenteId);
      if (!docenteInfo) {
        throw new NotFoundException(`Docente ${docenteId} no encontrado.`);
      }

      const remainingMonitors = postCloseCargos
        .filter((r) => r.cargo?.nombre && MONITOR_CARGOS.includes(r.cargo.nombre))
        .map((r) => r.cargo.nombre);

      if (remainingMonitors.length === 0) {
        // Sin ningún cargo de monitoreo vigente deja de dirigir: se da de baja y
        // se suelta la institución, que ya no le corresponde. Vuelve a tenerla
        // el día que lo designen de nuevo, acá o en otra I.E.
        docenteUpdate = { estado: 'Inactivo', institucionId: null };

        if (docenteInfo.usuarioId) {
          roleUpdate = { usuarioId: docenteInfo.usuarioId, roleCodigo: 'docente' };
        }
        if (docenteInfo.especialistaId) {
          especialistaUpdate = {
            especialistaId: docenteInfo.especialistaId,
            cargo: dc.cargo.nombre,
            estado: 'Inactivo',
          };
          monitorEspecialistaId = docenteInfo.especialistaId;
        }
      } else {
        let targetRole = 'docente';
        let highestCargo = '';
        if (remainingMonitors.includes('Director')) {
          targetRole = 'director_institucion';
          highestCargo = 'Director';
        } else if (remainingMonitors.includes('Coordinador Pedagógico')) {
          targetRole = 'coordinador_pedagogico';
          highestCargo = 'Coordinador Pedagógico';
        } else if (remainingMonitors.includes('Jefe de Taller')) {
          targetRole = 'jefe_taller';
          highestCargo = 'Jefe de Taller';
        }

        if (docenteInfo.usuarioId) {
          roleUpdate = { usuarioId: docenteInfo.usuarioId, roleCodigo: targetRole };
        }
        if (docenteInfo.especialistaId) {
          especialistaUpdate = {
            especialistaId: docenteInfo.especialistaId,
            cargo: highestCargo,
            estado: 'Activo',
          };
        }
      }
    }

    // Ejecutar finalizacion atomica (tx en repo)
    await this.docentesCargosRepository.finalizeCargo({
      docenteId,
      cargoId: docenteCargoId,
      fechaFin: fin,
      principalPromotionTargetId,
      roleUpdate,
      especialistaUpdate,
      monitorEspecialistaId,
      docenteUpdate,
    });

    // Invalidar TODAS las sesiones activas del usuario asociado al docente.
    const userId = await this.docentesCargosRepository.findUserIdByDocenteId(docenteId);
    if (userId) {
      await this.sessionRepository.invalidateAllUserSessions(userId, 'CARGO_FINALIZADO');
    }

    return { ok: true, cargoFinalizado: dc.cargo.nombre, fechaFin: fin };
  }
}
