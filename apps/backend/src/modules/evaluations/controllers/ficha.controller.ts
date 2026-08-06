/// <reference types="multer" />
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  IFichaMonitoreo,
  IHistorialPedagogicoResponse,
} from '@sistema-monitoreo/shared-contracts';
import { FichaService } from '../services/ficha.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import {
  CreateFichaDto,
  SaveRespuestaDesempenoDto,
  SaveRespuestaEjeItemDto,
  FinalizarFichaDto,
} from '../dto/ficha.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.js';

@Controller('fichas')
@UseGuards(AuthGuard, PermissionsGuard)
export class FichaController {
  constructor(private readonly service: FichaService) {}

  @Post()
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CreateFichaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.crear(dto, this.toSession(req));
  }

  @Get('visita/:cronogramaId')
  @RequirePermissions('monitoreo:read')
  async porVisita(
    @Param('cronogramaId', new ParseUUIDPipe()) cronogramaId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo | null> {
    return this.service.findByVisitaId(cronogramaId, this.toSession(req));
  }

  @Get('historial/:evaluadoId')
  @RequirePermissions('monitoreo:read')
  async historial(
    @Param('evaluadoId', new ParseUUIDPipe()) evaluadoId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IHistorialPedagogicoResponse> {
    return this.service.getHistorial(evaluadoId, this.toSession(req));
  }

  @Get(':id')
  @RequirePermissions('monitoreo:read')
  async porId(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.findById(id, this.toSession(req));
  }

  @Patch(':id/respuestas-desempeno')
  @RequirePermissions('monitoreo:execute')
  async guardarRespuesta(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveRespuestaDesempenoDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.guardarRespuesta(id, dto, this.toSession(req));
  }

  @Patch(':id/respuestas-aspecto/:aspectoId')
  @RequirePermissions('monitoreo:execute')
  async guardarRespuestaAspecto(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('aspectoId', new ParseUUIDPipe()) aspectoId: string,
    @Body() body: { marcado: boolean },
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.guardarRespuestaAspecto(id, aspectoId, body.marcado, this.toSession(req));
  }

  @Patch(':id/finalizar')
  @RequirePermissions('monitoreo:execute')
  async finalizar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: FinalizarFichaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.finalizar(id, dto, this.toSession(req));
  }

  @Patch(':id/respuestas-eje-item')
  @RequirePermissions('monitoreo:execute')
  async guardarRespuestaEjeItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveRespuestaEjeItemDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.guardarRespuestaEjeItem(id, dto, this.toSession(req));
  }

  @Post(':id/eje-item/:ejeItemId/evidencia')
  @RequirePermissions('monitoreo:execute')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async subirEvidencia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('ejeItemId', new ParseUUIDPipe()) ejeItemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ evidenciaUrl: string }> {
    const url = await this.service.subirEvidencia(id, ejeItemId, file, this.toSession(req));
    return { evidenciaUrl: url };
  }

  @Post(':id/migrar-plantilla')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.OK)
  async migrarPlantilla(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { plantillaId: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<IFichaMonitoreo> {
    return this.service.migrarPlantilla(id, body.plantillaId, this.toSession(req));
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
    };
  }
}
