import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  ISolicitudesVisitaResponse,
  ISolicitudVisita,
  ISolicitudVisitaDetalle,
} from '@sistema-monitoreo/shared-contracts';
import { VisitRequestsService } from '../services/visit-requests.service.js';
import {
  CrearSolicitudVisitaDto,
  ResolverSolicitudVisitaDto,
} from '../dto/crear-solicitud-visita.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { JwtPayload } from '../../auth/services/auth-token.service.js';

interface AuthenticatedRequest {
  user?: JwtPayload;
}

@Controller('solicitudes-visita')
@UseGuards(AuthGuard, PermissionsGuard)
export class VisitRequestsController {
  constructor(private readonly service: VisitRequestsService) {}

  /** Director UGEL solicita/prioriza una visita a una IE. */
  @Post()
  @RequirePermissions('visitas:solicitar')
  async crear(
    @Body() dto: CrearSolicitudVisitaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudVisita> {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    const nombre =
      `${req.user.nombres ?? ''} ${req.user.apellidos ?? ''}`.trim() || 'Director UGEL';
    return this.service.crear(dto, { id: req.user.sub, nombre });
  }

  /** Bandeja del Jefe de Gestión. */
  @Get()
  @RequirePermissions('visitas:gestionar')
  async listar(@Query('estado') estado?: string): Promise<ISolicitudesVisitaResponse> {
    return this.service.listar(estado);
  }

  /** Seguimiento de las solicitudes creadas por el propio usuario (Jefe de Área, etc.). */
  @Get('mias')
  @RequirePermissions('visitas:solicitar')
  async mias(
    @Query('estado') estado: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudesVisitaResponse> {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    return this.service.misSolicitudes(req.user.sub, estado);
  }

  /** Detalle de trazabilidad de una solicitud (propia si no se gestionan). */
  @Get(':id')
  @RequirePermissions('visitas:solicitar')
  async detalle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudVisitaDetalle> {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    const esGestor = req.user.permissions?.includes('visitas:gestionar') ?? false;
    return this.service.detalle(id, { userId: req.user.sub, esGestor });
  }

  @Patch(':id/atender')
  @RequirePermissions('visitas:gestionar')
  async atender(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolverSolicitudVisitaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    await this.service.atender(id, req.user.sub, dto);
    return { success: true };
  }

  @Patch(':id/rechazar')
  @RequirePermissions('visitas:gestionar')
  async rechazar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolverSolicitudVisitaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    await this.service.rechazar(id, req.user.sub, dto);
    return { success: true };
  }
}
