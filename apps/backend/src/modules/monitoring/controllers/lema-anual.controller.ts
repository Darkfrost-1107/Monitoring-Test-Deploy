import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { ILemaAnual } from '@sistema-monitoreo/shared-contracts';
import { LemaAnualService } from '../services/lema-anual.service.js';
import { UpsertLemaAnualDto } from '../dto/upsert-lema-anual.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.js';

/**
 * Lema oficial del Estado peruano, uno por año académico.
 *
 * La lectura la necesita cualquiera que imprima una ficha; la escritura, sólo
 * quien registra plantillas, que es donde se carga.
 */
@Controller('lemas-anuales')
@UseGuards(AuthGuard, PermissionsGuard)
export class LemaAnualController {
  constructor(private readonly service: LemaAnualService) {}

  /** Devuelve nulo —no un error— cuando el año todavía no tiene lema. */
  @Get(':anio')
  @RequirePermissions('monitoreo:read')
  async findByAnio(@Param('anio', ParseIntPipe) anio: number): Promise<ILemaAnual | null> {
    return this.service.findByAnio(anio);
  }

  @Put(':anio')
  @RequirePermissions('monitoreo:execute')
  async upsert(
    @Param('anio', ParseIntPipe) anio: number,
    @Body() dto: UpsertLemaAnualDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ILemaAnual> {
    if (!req.user) {
      throw new ForbiddenException('Sesion no encontrada.');
    }

    return this.service.upsert(anio, dto.lema, req.user.sub);
  }
}
