import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../auth/services/auth-token.service.js';
import { EspecialistaService } from '../services/especialista.service.js';
import { CreateEspecialistaDto } from '../dto/create-especialista.dto.js';
import { UpdateEspecialistaDto } from '../dto/update-especialista.dto.js';
import { QueryEspecialistaDto } from '../dto/query-especialista.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { IEspecialistaResponse } from '@sistema-monitoreo/shared-contracts';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('especialistas')
@UseGuards(AuthGuard, PermissionsGuard)
export class EspecialistaController {
  constructor(private readonly service: EspecialistaService) {}

  @Get()
  @RequirePermissions('especialistas:read')
  async findAll(@Query() query: QueryEspecialistaDto): Promise<IEspecialistaResponse[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('especialistas:read')
  async findById(@Param('id') id: string): Promise<IEspecialistaResponse | null> {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEspecialistaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IEspecialistaResponse> {
    return this.service.create(dto, req.user);
  }

  @Post('persona/:personaId/transicion-a-especialista')
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.CREATED)
  async transicionRolAEspecialista(
    @Param('personaId') personaId: string,
    @Body() dto: CreateEspecialistaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IEspecialistaResponse> {
    return this.service.transicionRolAEspecialista(personaId, dto, req.user);
  }

  @Put(':id')
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEspecialistaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IEspecialistaResponse> {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<IEspecialistaResponse> {
    return this.service.delete(id);
  }

  @Patch(':id/alta')
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string): Promise<IEspecialistaResponse> {
    return this.service.activate(id);
  }

  @Patch(':id/retirar-cargo')
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.OK)
  async retirarCargo(@Param('id') id: string): Promise<IEspecialistaResponse> {
    return this.service.retirarCargo(id);
  }

  @Patch(':id/baja')
  @RequirePermissions('especialistas:write')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string): Promise<IEspecialistaResponse> {
    return this.service.deactivate(id);
  }
}
