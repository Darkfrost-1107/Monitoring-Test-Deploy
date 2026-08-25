import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  ICarpetaPedagogica,
  ICarpetaPedagogicaResponse,
} from '@sistema-monitoreo/shared-contracts';
import { CarpetaPedagogicaService } from '../services/carpeta-pedagogica.service.js';
import { GuardarCarpetaPedagogicaDto } from '../dto/guardar-carpeta-pedagogica.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { JwtPayload } from '../../auth/services/auth-token.service.js';

interface AuthenticatedRequest {
  user?: JwtPayload;
}

/**
 * Carpeta pedagógica del docente.
 *
 * Las rutas de escritura son `/mia` y no `/:docenteId` a propósito: la ruta
 * misma declara que no hay forma de escribir sobre la carpeta de otro. La
 * capacidad abre la puerta; la identidad de la sesión elige la fila.
 */
@Controller('carpeta-pedagogica')
@UseGuards(AuthGuard, PermissionsGuard)
export class CarpetaPedagogicaController {
  constructor(private readonly service: CarpetaPedagogicaService) {}

  /** Enlace propio del año indicado. */
  @Get('mia')
  @RequirePermissions('carpeta_pedagogica:write')
  async mia(
    @Query('anio', ParseIntPipe) anio: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<ICarpetaPedagogicaResponse> {
    return this.service.obtenerPropia(this.usuarioDe(req), anio);
  }

  /** Registra o reemplaza el enlace propio. */
  @Put('mia')
  @RequirePermissions('carpeta_pedagogica:write')
  async guardar(
    @Body() dto: GuardarCarpetaPedagogicaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ICarpetaPedagogica> {
    return this.service.guardarPropia(this.usuarioDe(req), dto);
  }

  /** Retira el enlace propio del año indicado. */
  @Delete('mia')
  @RequirePermissions('carpeta_pedagogica:write')
  async eliminar(
    @Query('anio', ParseIntPipe) anio: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    await this.service.eliminarPropia(this.usuarioDe(req), anio);
    return { success: true };
  }

  /** Enlace de un docente, para quien lo monitorea. */
  @Get('docente/:docenteId')
  @RequirePermissions('carpeta_pedagogica:read')
  async deDocente(
    @Param('docenteId', new ParseUUIDPipe()) docenteId: string,
    @Query('anio', ParseIntPipe) anio: number,
  ): Promise<ICarpetaPedagogicaResponse> {
    return this.service.obtenerDeDocente(docenteId, anio);
  }

  private usuarioDe(req: AuthenticatedRequest): string {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    return req.user.sub;
  }
}
