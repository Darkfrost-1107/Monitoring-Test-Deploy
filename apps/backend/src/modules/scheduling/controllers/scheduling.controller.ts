import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import type { IVisita, ISolicitudReprogramacion } from '@sistema-monitoreo/shared-contracts';
import { SchedulingService } from '../services/scheduling.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import { CreateVisitaDto, UpdateVisitaDto } from '../dto/create-visita.dto.js';
import {
  CreateSolicitudReprogramacionDto,
  ResolverSolicitudDto,
} from '../dto/solicitud-reprogramacion.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.js';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  // ============== Cronogramas ==============

  @Post('cronogramas')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.CREATED)
  async crearVisita(
    @Body() dto: CreateVisitaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IVisita> {
    return this.service.crearVisita(dto, this.toSession(req));
  }

  @Get('cronogramas')
  @RequirePermissions('monitoreo:execute')
  async listarVisitas(
    @Query() query: Record<string, any>,
    @Req() req: AuthenticatedRequest,
  ): Promise<IVisita[]> {
    return this.service.findAllVisitas(query, this.toSession(req));
  }

  @Get('cronogramas/:id')
  @RequirePermissions('monitoreo:execute')
  async obtenerVisita(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IVisita> {
    return this.service.findVisitaById(id, this.toSession(req));
  }

  @Patch('cronogramas/:id')
  @RequirePermissions('monitoreo:execute')
  async actualizarVisita(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVisitaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IVisita> {
    return this.service.actualizarVisita(id, dto, this.toSession(req));
  }

  @Delete('cronogramas/:id')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarVisita(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.service.eliminarVisita(id, this.toSession(req));
  }

  // ============== Solicitudes de Reprogramacion ==============

  @Post('solicitudes-reprogramacion')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.CREATED)
  async crearSolicitud(
    @Body() dto: CreateSolicitudReprogramacionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudReprogramacion> {
    return this.service.crearSolicitud(dto, this.toSession(req));
  }

  @Get('solicitudes-reprogramacion')
  @RequirePermissions('monitoreo:execute')
  async getSolicitudes(
    @Query() query: Partial<ISolicitudReprogramacion>,
  ): Promise<ISolicitudReprogramacion[]> {
    return this.service.findAllSolicitudes(query);
  }

  @Get('solicitudes-reprogramacion/:id')
  @RequirePermissions('monitoreo:execute')
  async getSolicitudById(@Param('id') id: string): Promise<ISolicitudReprogramacion> {
    return this.service.findSolicitudById(id);
  }

  @Post('solicitudes-reprogramacion/:id/aprobar')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolverSolicitudDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudReprogramacion> {
    return this.service.aprobarSolicitud(id, dto, this.toSession(req));
  }

  @Post('solicitudes-reprogramacion/:id/rechazar')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.OK)
  async rechazar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolverSolicitudDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudReprogramacion> {
    return this.service.rechazarSolicitud(id, dto, this.toSession(req));
  }

  private toSession(req: AuthenticatedRequest): SessionUser {
    if (!req.user) {
      throw new ForbiddenException('Sesion no encontrada.');
    }
    return {
      id: req.user.sub,
      role: req.user.role,
      institucionId: req.user.institucion_id ?? null,
      especialistaNivel: req.user.especialista_nivel ?? null,
      especialistaEspecialidades: req.user.especialista_especialidades ?? null,
    };
  }
}
