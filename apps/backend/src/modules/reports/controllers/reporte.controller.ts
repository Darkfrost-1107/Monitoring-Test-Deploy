import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReporteService } from '../services/reporte.service.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type {
  IPaginatedReportesFichas,
  IReporteResumenIE,
} from '@sistema-monitoreo/shared-contracts';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.js';

@Controller('reportes')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReporteController {
  constructor(private readonly service: ReporteService) {}

  @Get('fichas-completadas')
  @RequirePermissions('reports:read')
  async fichasCompletadas(
    @Query() query: any,
    @Req() req: AuthenticatedRequest,
  ): Promise<IPaginatedReportesFichas> {
    return this.service.listFichasCompletadas(query, this.toSession(req));
  }

  @Get('resumen-ie')
  @RequirePermissions('reports:read')
  async resumenIE(
    @Query('anio') anio: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IReporteResumenIE[]> {
    const anioNumber = anio ? parseInt(anio, 10) : new Date().getFullYear();
    return this.service.resumenPorIE(anioNumber, this.toSession(req));
  }

  @Get('ficha/:id/export-html')
  @RequirePermissions('reports:read')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async exportarFichaHTML(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.service.exportarFichaHTML(id, this.toSession(req));
    res.send(html);
  }

  @Get('ficha/:id/pdf')
  @RequirePermissions('reports:read')
  @Header('Content-Type', 'application/pdf')
  async exportarFichaPDF(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.service.exportarFichaPDF(id, this.toSession(req));
    res.setHeader('Content-Disposition', `attachment; filename="ficha_${id}.pdf"`);
    res.send(pdfBuffer);
  }

  private toSession(req: AuthenticatedRequest): any {
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
