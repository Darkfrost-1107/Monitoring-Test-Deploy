import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeachersService } from '../services/teachers.service.js';
import { CreateDocenteDto } from '../dto/create-docente.dto.js';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import {
  RestablecerContrasenaResponse,
  RestablecerContrasenaService,
} from '../services/restablecer-contrasena.service.js';
import { UpdateDocenteDto } from '../dto/update-docente.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { Request } from 'express';
import { JwtPayload } from '../../auth/services/auth-token.service.js';
import { DocenteEntity } from '../repositories/teachers.repository.js';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('docentes')
@UseGuards(AuthGuard, PermissionsGuard)
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly restablecerContrasenaService: RestablecerContrasenaService,
  ) {}

  @Post()
  @RequirePermissions('docentes:write')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDocenteDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DocenteEntity> {
    return this.teachersService.createDocente(dto, req.user);
  }

  @Post('persona/:personaId/transicion-a-docente')
  @RequirePermissions('docentes:write')
  @HttpCode(HttpStatus.OK)
  async transicionRolADocente(
    @Param('personaId') personaId: string,
    @Body() dto: CreateDocenteDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DocenteEntity> {
    return this.teachersService.transicionRolADocente(personaId, dto, req.user);
  }

  @Get()
  @RequirePermissions('docentes:read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: AuthenticatedRequest): Promise<DocenteEntity[]> {
    return this.teachersService.getDocentes(req.user);
  }

  @Get('cargos')
  @RequirePermissions('docentes:read')
  @HttpCode(HttpStatus.OK)
  async findCargos(): Promise<any[]> {
    return this.teachersService.getCargos();
  }

  // Sin @RequirePermissions: es una búsqueda transversal (gestores de docentes y el
  // superadmin). La autorización fina (docentes:read O especialistas:read) va en el servicio.
  @Get('buscar/:dni')
  @HttpCode(HttpStatus.OK)
  async findByDni(@Param('dni') dni: string, @Req() req: AuthenticatedRequest): Promise<any> {
    return this.teachersService.findPersonaByDni(dni, req.user);
  }

  @Put(':id')
  @RequirePermissions('docentes:write')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocenteDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DocenteEntity> {
    return this.teachersService.updateDocente(id, dto, req.user);
  }

  @Patch(':id/baja')
  @RequirePermissions('docentes:write')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    message: string;
    docente: {
      id: string;
      estado: string;
      persona: { dni: string; nombres: string; apellidos: string };
    };
  }> {
    return this.teachersService.bajaDocente(id, req.user);
  }

  @Patch(':id/alta')
  @RequirePermissions('docentes:write')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    message: string;
    docente: {
      id: string;
      estado: string;
      persona: { dni: string; nombres: string; apellidos: string };
    };
  }> {
    return this.teachersService.altaDocente(id, req.user);
  }

  @Post(':id/restablecer-contrasena')
  @RequirePermissions(Capability.PERSONAL_RESTABLECER_CONTRASENA)
  @HttpCode(HttpStatus.OK)
  async restablecerContrasena(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<RestablecerContrasenaResponse> {
    return this.restablecerContrasenaService.restablecer(id, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':evaluadorId/asignaciones')
  @RequirePermissions('docentes:read')
  @HttpCode(HttpStatus.OK)
  async getAsignaciones(
    @Param('evaluadorId') evaluadorId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<any[]> {
    return this.teachersService.getAsignaciones(evaluadorId, req.user);
  }

  @Post(':evaluadorId/asignaciones')
  @RequirePermissions('docentes:write')
  @HttpCode(HttpStatus.OK)
  async saveAsignaciones(
    @Param('evaluadorId') evaluadorId: string,
    @Body() dto: { evaluadoIds: string[] },
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    return this.teachersService.saveAsignaciones(evaluadorId, dto.evaluadoIds, req.user);
  }
}
