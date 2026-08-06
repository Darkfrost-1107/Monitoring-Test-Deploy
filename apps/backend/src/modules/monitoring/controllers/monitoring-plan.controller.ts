import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  IMonitoringPlanResponse,
  IPlanInstitucionCubierta,
} from '@sistema-monitoreo/shared-contracts';
import type { SessionUser } from '../../../shared/types/session-user.js';
import { MonitoringPlanService } from '../services/monitoring-plan.service.js';
import { CreatePlanDto } from '../dto/create-plan.dto.js';
import { QueryPlanDto } from '../dto/query-plan.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { STORAGE_SERVICE } from '../../../shared/storage/storage.constants.js';
import type { StorageService } from '../../../shared/storage/storage.constants.js';
import { Inject } from '@nestjs/common';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.js';

@Controller('planes-monitoreo')
@UseGuards(AuthGuard, PermissionsGuard)
export class MonitoringPlanController {
  constructor(
    private readonly service: MonitoringPlanService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  @Post()
  @RequirePermissions('monitoreo:execute')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(pdf)$/i)) {
          return callback(
            new BadRequestException('Solo se permiten archivos en formato PDF.'),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePlanDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<IMonitoringPlanResponse> {
    if (!file) {
      throw new BadRequestException('El archivo PDF es obligatorio.');
    }
    const stored = await this.storage.savePdf('planes', file.originalname, file.buffer);
    const dtoWithUrl: CreatePlanDto = { ...dto, archivoUrl: stored.url };
    const session: SessionUser = this.toSession(req);
    return this.service.create(dtoWithUrl, session);
  }

  @Get()
  @RequirePermissions('monitoreo:execute')
  async findAll(
    @Query() query: QueryPlanDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IMonitoringPlanResponse[]> {
    const session: SessionUser = this.toSession(req);
    const adjusted: QueryPlanDto = { ...query };
    if (session.role === RoleCode.DIRECTOR_INSTITUCION) {
      adjusted.tipoEntidad = 'IE';
    }
    return this.service.findAll(adjusted, session);
  }

  @Get(':id')
  @RequirePermissions('monitoreo:execute')
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IMonitoringPlanResponse> {
    return this.service.findById(id, this.toSession(req));
  }

  @Get(':id/archivo')
  @RequirePermissions('monitoreo:execute')
  async descargarArchivo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const plan = await this.service.findById(id, this.toSession(req));
    if (!plan.archivoUrl) {
      res.status(404).json({ message: 'El plan no tiene archivo adjunto.' });
      return;
    }
    const absolutePath = this.storage.resolveAbsolutePath(plan.archivoUrl);
    res.sendFile(absolutePath, (err: any) => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'Archivo no encontrado en disco.' });
      }
    });
  }

  @Delete(':id')
  @RequirePermissions('monitoreo:execute')
  async toggle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IMonitoringPlanResponse> {
    return this.service.toggleEstado(id, this.toSession(req));
  }

  @Delete(':id/hard')
  @RequirePermissions('monitoreo:execute')
  async hardDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.hardDelete(id, this.toSession(req));
  }

  @Get(':id/cobertura')
  @RequirePermissions('monitoreo:execute')
  async findCobertura(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IPlanInstitucionCubierta[]> {
    return this.service.findCobertura(id, this.toSession(req));
  }

  @Post(':id/cobertura/:institucionId')
  @RequirePermissions('monitoreo:execute')
  @HttpCode(HttpStatus.CREATED)
  async addCobertura(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('institucionId', new ParseUUIDPipe()) institucionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IPlanInstitucionCubierta[]> {
    return this.service.addCobertura(id, institucionId, this.toSession(req));
  }

  @Delete(':id/cobertura/:institucionId')
  @RequirePermissions('monitoreo:execute')
  async removeCobertura(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('institucionId', new ParseUUIDPipe()) institucionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IPlanInstitucionCubierta[]> {
    return this.service.removeCobertura(id, institucionId, this.toSession(req));
  }

  private toSession(req: AuthenticatedRequest): SessionUser {
    if (!req.user) {
      throw new ForbiddenException('Sesion no encontrada.');
    }
    return {
      id: req.user.sub,
      role: req.user.role,
      institucionId: req.user.institucion_id ?? null,
    };
  }
}
