import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { IVisita, EstadoVisita } from '@sistema-monitoreo/shared-contracts';
import type {
  CronogramaRepository,
  CreateVisitaData,
  UpdateVisitaData,
} from '../repositories/cronograma.repository.js';
import type { CreateVisitaDto, UpdateVisitaDto } from '../dto/create-visita.dto.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { ScopeFilter, ScopeContext } from '../../../shared/auth/scope-filter.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

function toScopeContext(session: SessionUser): ScopeContext {
  return {
    userId: session.id,
    role: session.role,
    institucionId: session.institucionId,
    especialistaNivel: session.especialistaNivel,
    especialistaEspecialidades: session.especialistaEspecialidades,
  };
}

function aplicarScopingVisitas(
  visitas: IVisita[],
  scopeFilter: ScopeFilter,
  session?: SessionUser,
): IVisita[] {
  if (!session) return visitas;
  const ctx = toScopeContext(session);
  if (scopeFilter.isAllScope(ctx.role)) return visitas;
  if (scopeFilter.isInstitucionScope(ctx.role)) {
    return ctx.institucionId ? visitas.filter((v) => v.institucionId === ctx.institucionId) : [];
  }
  if (scopeFilter.isMonitorScope(ctx.role)) return visitas;
  if (scopeFilter.isJefeAreaScope(ctx.role)) {
    const nivel = ctx.especialistaNivel;
    return visitas.filter((v) => {
      if (nivel === 'Inicial') {
        return (
          (v.modalidad === 'EBR' && v.nivelEducativo?.toLowerCase() === 'inicial') ||
          v.modalidad === 'EBE'
        );
      }
      if (nivel === 'Primaria') {
        return v.modalidad === 'EBR' && v.nivelEducativo?.toLowerCase() === 'primaria';
      }
      if (nivel === 'Secundaria') {
        return (
          (v.modalidad === 'EBR' && v.nivelEducativo?.toLowerCase() === 'secundaria') ||
          v.modalidad === 'EBA' ||
          v.modalidad === 'CEPTRO'
        );
      }
      return false;
    });
  }
  return [];
}

function validarAccesoVisita(
  visita: IVisita,
  scopeFilter: ScopeFilter,
  session?: SessionUser,
): void {
  if (!session) return;
  const ctx = toScopeContext(session);
  if (scopeFilter.isAllScope(ctx.role)) return;
  if (scopeFilter.isInstitucionScope(ctx.role)) {
    if (visita.institucionId !== ctx.institucionId) {
      throw new ForbiddenException('No tiene acceso a esta visita (otra institucion).');
    }
  }
  if (scopeFilter.isJefeAreaScope(ctx.role)) {
    const nivel = ctx.especialistaNivel;
    const isEbrInicial =
      visita.modalidad === 'EBR' && visita.nivelEducativo?.toLowerCase() === 'inicial';
    const isEbrPrimaria =
      visita.modalidad === 'EBR' && visita.nivelEducativo?.toLowerCase() === 'primaria';
    const isEbrSecundaria =
      visita.modalidad === 'EBR' && visita.nivelEducativo?.toLowerCase() === 'secundaria';
    const isEbe = visita.modalidad === 'EBE';
    const isEba = visita.modalidad === 'EBA';
    const isCeptro = visita.modalidad === 'CEPTRO';

    if (nivel === 'Inicial' && !isEbrInicial && !isEbe) {
      throw new ForbiddenException('No tiene acceso a esta visita (solo EBR Inicial o EBE).');
    }
    if (nivel === 'Primaria' && !isEbrPrimaria) {
      throw new ForbiddenException('No tiene acceso a esta visita (solo EBR Primaria).');
    }
    if (nivel === 'Secundaria' && !isEbrSecundaria && !isEba && !isCeptro) {
      throw new ForbiddenException(
        'No tiene acceso a esta visita (solo EBR Secundaria, EBA o CEPTRO).',
      );
    }
  }
}

export async function findAllVisitas(
  cronogramaRepo: CronogramaRepository,
  scopeFilter: ScopeFilter,
  filters?: Record<string, unknown>,
  session?: SessionUser,
): Promise<IVisita[]> {
  const queryFilters: Record<string, unknown> = { ...filters };
  if (session) {
    const ctx = toScopeContext(session);
    if (scopeFilter.isJefeAreaScope(ctx.role)) {
      if (ctx.especialistaEspecialidades && ctx.especialistaEspecialidades.length > 0) {
        queryFilters.monitorEspecialidades = ctx.especialistaEspecialidades;
      }
    }
  }
  const data = await cronogramaRepo.findAll(queryFilters);
  return aplicarScopingVisitas(data, scopeFilter, session);
}

export async function findVisitaById(
  cronogramaRepo: CronogramaRepository,
  scopeFilter: ScopeFilter,
  id: string,
  session?: SessionUser,
): Promise<IVisita> {
  const v = await cronogramaRepo.findById(id);
  if (!v) throw new NotFoundException(`Visita ${id} no encontrada.`);
  validarAccesoVisita(v, scopeFilter, session);
  return v;
}

export async function crearVisita(
  cronogramaRepo: CronogramaRepository,
  scopeFilter: ScopeFilter,
  dto: CreateVisitaDto,
  session: SessionUser,
): Promise<IVisita> {
  if (session.role === RoleCode.JEFE_AREA) {
    const jefeNivel = session.especialistaNivel;
    const targetMod = dto.modalidad || 'EBR';
    const targetNivel = dto.nivelEducativo;

    if (jefeNivel === 'Inicial') {
      const isValid = (targetMod === 'EBR' && targetNivel === 'Inicial') || targetMod === 'EBE';
      if (!isValid) {
        throw new ForbiddenException(
          'Un Jefe de Área de nivel Inicial solo puede registrar visitas de nivel Inicial (EBR) o de la modalidad Especial (EBE).',
        );
      }
    } else if (jefeNivel === 'Primaria') {
      const isValid = targetMod === 'EBR' && targetNivel === 'Primaria';
      if (!isValid) {
        throw new ForbiddenException(
          'Un Jefe de Área de nivel Primaria solo puede registrar visitas de nivel Primaria (EBR).',
        );
      }
    } else if (jefeNivel === 'Secundaria') {
      const isValid =
        (targetMod === 'EBR' && targetNivel === 'Secundaria') ||
        targetMod === 'EBA' ||
        targetMod === 'CEPTRO';
      if (!isValid) {
        throw new ForbiddenException(
          'Un Jefe de Área de nivel Secundaria solo puede registrar visitas de nivel Secundaria (EBR), Alternativa (EBA) o CEPTRO.',
        );
      }
    }
  }

  const anio = new Date(dto.fechaProgramada).getFullYear();
  const planId = await cronogramaRepo.findPlanVigentePara(dto.institucionId, anio);
  if (!planId) {
    throw new BadRequestException(
      `No se encontró un Plan de Monitoreo Activo para el año ${anio}. ` +
        'Antes de programar visitas, el Jefe de Gestión debe registrar y activar un plan anual.',
    );
  }

  // La plantilla la decide quién ejecuta la visita, no quién la programa: el
  // director puede programarle una al Jefe de Taller, y esa usa la del Jefe de
  // Taller. Se comprueba acá, al programar, y no al levantar la ficha: descubrir
  // que falta con el evaluador ya en el aula cuesta el viaje.
  const plantillaId = await cronogramaRepo.findPlantillaVigentePara(
    dto.tipoMonitoreo,
    anio,
    dto.monitorId,
  );
  if (!plantillaId) {
    throw new BadRequestException(
      `El monitor asignado no tiene una Plantilla de Monitoreo vigente para ${dto.tipoMonitoreo} ` +
        `del año ${anio}. Cada actor monitorea con la suya: debe registrarla o clonar la del ` +
        'Director antes de que se le programen visitas.',
    );
  }

  const activas = await cronogramaRepo.validateEntidadesActivas(
    dto.institucionId,
    dto.monitorId,
    dto.evaluadoId,
  );
  if (!activas.institucion) {
    throw new BadRequestException('La institución educativa seleccionada no está Activa.');
  }
  if (!activas.monitor) {
    throw new BadRequestException(
      'El monitor (especialista/director) seleccionado no está activo.',
    );
  }
  if (activas.monitorCargo === 'Jefe de Área') {
    throw new ForbiddenException(
      'Los Jefes de Área no pueden realizar visitas (rol no evaluador).',
    );
  }
  // El Director de UGEL conduce la unidad, no hace monitoreo de campo: no debe
  // ser monitor de una visita, porque quien monitorea firma la ficha y él no
  // tiene esa potestad. Sin esta regla la ficha quedaría sin poder cerrarse.
  if (activas.monitorEsDirectorUgel) {
    throw new ForbiddenException(
      'El Director de UGEL no realiza visitas de monitoreo: seleccione un especialista.',
    );
  }
  if (!activas.evaluado) {
    throw new BadRequestException('El evaluado (docente/director) seleccionado no está activo.');
  }

  // A un director se lo evalúa sólo con la ficha directiva. Sin esta regla se
  // le podía programar una visita con ficha docente, y la ficha equivocada no
  // se nota hasta que ya está llena: mide desempeño de aula a quien conduce la
  // institución, y los tableros terminan mostrándolo como docente porque el
  // instrumento es lo único que dice qué se evaluó.
  if (activas.evaluadoEsDirector && dto.tipoMonitoreo !== 'DIRECTIVO') {
    throw new BadRequestException(
      'El evaluado dirige la institución y solo puede monitorearse con la ficha directiva. ' +
        'Seleccione el tipo de monitoreo DIRECTIVO.',
    );
  }

  // REGLA DE NEGOCIO EDU-0002: Máximo 3 visitas pendientes (Programada/Reprogramada) por monitor
  const pendingVisitsCount = await cronogramaRepo.countPendientesByMonitor(dto.monitorId);
  if (pendingVisitsCount >= 3) {
    throw new BadRequestException(
      'El monitor ya tiene 3 visitas pendientes. Complete las visitas programadas antes de crear nuevas.',
    );
  }

  // Validar solapamiento de visitas para el monitor
  const fechaToUse =
    typeof dto.fechaProgramada === 'string' ? new Date(dto.fechaProgramada) : dto.fechaProgramada;
  const visitasMismoDia = await cronogramaRepo.findVisitasMonitorPorFecha(
    dto.monitorId,
    fechaToUse,
  );
  const [horaProp, minProp] = dto.horaInicio.split(':').map(Number);
  const tiempoProp = horaProp * 60 + minProp;

  for (const v of visitasMismoDia) {
    const [horaV, minV] = v.horaInicio.split(':').map(Number);
    const tiempoV = horaV * 60 + minV;
    if (Math.abs(tiempoProp - tiempoV) < 120) {
      // 2 horas
      throw new BadRequestException(
        `El monitor ya tiene una visita programada a las ${v.horaInicio} el mismo día. Debe haber al menos 2 horas de diferencia.`,
      );
    }
  }

  // Validar nVisita para el evaluado en el mismo año
  const existeVisita = await cronogramaRepo.findVisitaExistente(
    dto.evaluadoId,
    anio,
    dto.numeroVisita,
  );
  if (existeVisita) {
    throw new BadRequestException(
      `El evaluado ya tiene una visita programada con el número ${dto.numeroVisita} en el año ${anio}.`,
    );
  }

  // Validar fecha en contexto de otras visitas del mismo evaluado
  const fechaStr = dto.fechaProgramada.split('T')[0];

  // Obtener fecha actual en Perú (UTC-5) para evitar desfase con servidor UTC
  const now = new Date();
  const peruMs = now.getTime() - 5 * 60 * 60 * 1000;
  const peruDate = new Date(peruMs);
  const hoyStr = `${peruDate.getUTCFullYear()}-${String(peruDate.getUTCMonth() + 1).padStart(2, '0')}-${String(peruDate.getUTCDate()).padStart(2, '0')}`;

  if (fechaStr < hoyStr) {
    throw new BadRequestException('La fecha programada no puede ser anterior a la fecha actual.');
  } else if (fechaStr === hoyStr) {
    const currentHourStr = String(peruDate.getUTCHours()).padStart(2, '0');
    const currentMinStr = String(peruDate.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHourStr}:${currentMinStr}`;

    if (dto.horaInicio < currentTimeStr) {
      throw new BadRequestException('La hora programada no puede ser anterior a la hora actual.');
    }
  }

  // Validar orden cronológico entre visitas del mismo evaluado
  const visitaAnterior = await cronogramaRepo.findVisitaExistente(
    dto.evaluadoId,
    anio,
    dto.numeroVisita - 1,
  );
  const visitaSiguiente = await cronogramaRepo.findVisitaExistente(
    dto.evaluadoId,
    anio,
    dto.numeroVisita + 1,
  );

  if (visitaAnterior) {
    const fechaAntNum = parseInt(visitaAnterior.fechaProgramada.replace(/-/g, ''));
    const fechaStrNum = parseInt(fechaStr.replace(/-/g, ''));
    if (fechaStrNum <= fechaAntNum) {
      throw new BadRequestException(
        `La visita N.° ${dto.numeroVisita} debe programarse al menos 1 día después de la visita N.° ${dto.numeroVisita - 1} ` +
          `(${visitaAnterior.fechaProgramada}).`,
      );
    }
  }

  if (visitaSiguiente) {
    const fechaSigNum = parseInt(visitaSiguiente.fechaProgramada.replace(/-/g, ''));
    const fechaStrNum = parseInt(fechaStr.replace(/-/g, ''));
    if (fechaSigNum <= fechaStrNum) {
      throw new BadRequestException(
        `La visita N.° ${dto.numeroVisita} debe programarse al menos 1 día antes de la visita N.° ${dto.numeroVisita + 1} ` +
          `(${visitaSiguiente.fechaProgramada}).`,
      );
    }
  }

  const data: CreateVisitaData = {
    monitorId: dto.monitorId,
    institucionId: dto.institucionId,
    evaluadoId: dto.evaluadoId,
    tipoMonitoreo: dto.tipoMonitoreo,
    numeroVisita: dto.numeroVisita,
    fechaProgramada: new Date(dto.fechaProgramada),
    horaInicio: dto.horaInicio,
    modalidad: dto.modalidad,
    nivelEducativo: dto.nivelEducativo,
    detalles: dto.detalles,
    creadoPorId: session.id,
  };
  const created = await cronogramaRepo.create(data);
  return cronogramaRepo.findById(created.id) as Promise<IVisita>;
}

export async function actualizarVisita(
  cronogramaRepo: CronogramaRepository,
  scopeFilter: ScopeFilter,
  id: string,
  dto: UpdateVisitaDto,
  session: SessionUser,
): Promise<IVisita> {
  const existing = await cronogramaRepo.findById(id);
  if (!existing) throw new NotFoundException(`Visita ${id} no encontrada.`);
  validarAccesoVisita(existing, scopeFilter, session);
  if (dto.fechaProgramada || dto.horaInicio) {
    throw new BadRequestException(
      'fecha/hora solo se modifican aprobando una SolicitudReprogramacion. Use POST /solicitudes-reprogramacion.',
    );
  }
  const data: UpdateVisitaData = {
    detalles: dto.detalles,
    estado: dto.estado as EstadoVisita,
  };
  return cronogramaRepo.update(id, data);
}

export async function eliminarVisita(
  cronogramaRepo: CronogramaRepository,
  scopeFilter: ScopeFilter,
  id: string,
  session: SessionUser,
): Promise<void> {
  const existing = await cronogramaRepo.findById(id);
  if (!existing) throw new NotFoundException(`Visita ${id} no encontrada.`);
  validarAccesoVisita(existing, scopeFilter, session);
  if (existing.estado === 'COMPLETADO') {
    throw new BadRequestException(
      'No se puede anular una visita en estado COMPLETADO (tiene ficha asociada).',
    );
  }
  if (existing.estado === 'ANULADO') {
    throw new BadRequestException('La visita ya se encuentra anulada.');
  }
  await cronogramaRepo.remove(id);
}
