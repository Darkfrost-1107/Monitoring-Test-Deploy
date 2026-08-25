import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import * as path from 'node:path';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Header,
  NotFoundException,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  ISolicitudPlantilla,
  ISolicitudesPlantillaResponse,
  IValeDisponible,
} from '@sistema-monitoreo/shared-contracts';
import { SolicitudesPlantillaService } from '../services/solicitudes-plantilla.service.js';
import { ValePlantillaService } from '../services/vale-plantilla.service.js';
import {
  CrearSolicitudPlantillaDto,
  ResolverSolicitudPlantillaDto,
} from '../dto/crear-solicitud-plantilla.dto.js';
import { StorageService } from '../../storage/storage.service.js';
import { MAX_PDF_BYTES, PdfPipe } from '../../storage/pipes/pdf.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import type { JwtPayload } from '../../auth/services/auth-token.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

interface AuthenticatedRequest {
  user?: JwtPayload;
}

/**
 * Solicitudes de plantilla de las instituciones.
 *
 * Las rutas se separan por capacidad y no por parámetro: el director presenta y
 * consulta lo suyo con `solicitudes_plantilla:solicitar`; el Jefe de Gestión ve
 * la bandeja y decide con `:gestionar`. Nadie llega a la ruta del otro.
 */
@Controller('solicitudes-plantilla')
@UseGuards(AuthGuard, PermissionsGuard)
export class SolicitudesPlantillaController {
  constructor(
    private readonly service: SolicitudesPlantillaService,
    private readonly vales: ValePlantillaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Presenta la solicitud con su justificación en PDF.
   *
   * El archivo se valida por CONTENIDO antes de tocar el disco: `PdfPipe`
   * comprueba la firma del formato, no la extensión ni el `mimetype`, que los
   * declara quien envía.
   */
  @Post()
  @RequirePermissions('solicitudes_plantilla:solicitar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }))
  async crear(
    @Body() dto: CrearSolicitudPlantillaDto,
    @UploadedFile(PdfPipe) pdf: Buffer,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudPlantilla> {
    const url = await this.storage.saveJustificacionPdf(pdf);
    return this.service.crear(this.sesionDe(req), dto, url);
  }

  /** Seguimiento de los pedidos de la propia institución. */
  @Get('mias')
  @RequirePermissions('solicitudes_plantilla:solicitar')
  async mias(
    @Query('estado') estado: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudesPlantillaResponse> {
    return this.service.mias(this.sesionDe(req), estado);
  }

  /**
   * Cupos aprobados y sin usar de la institución.
   *
   * La pantalla de creación de plantillas los ofrece, pero no son el control:
   * `PlantillaService` los vuelve a verificar y consume al crear.
   */
  @Get('mias/cupos')
  @RequirePermissions('monitoreo:read')
  async cupos(
    @Query('anio', ParseIntPipe) anio: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<IValeDisponible[]> {
    return this.vales.disponibles(this.sesionDe(req), anio);
  }

  /** Bandeja del Jefe de Gestión. */
  @Get()
  @RequirePermissions('solicitudes_plantilla:gestionar')
  async listar(@Query('estado') estado?: string): Promise<ISolicitudesPlantillaResponse> {
    return this.service.listar(estado);
  }

  @Patch(':id/aprobar')
  @RequirePermissions('solicitudes_plantilla:gestionar')
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolverSolicitudPlantillaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudPlantilla> {
    return this.service.aprobar(id, this.sesionDe(req), dto.comentario);
  }

  @Patch(':id/rechazar')
  @RequirePermissions('solicitudes_plantilla:gestionar')
  @HttpCode(HttpStatus.OK)
  async rechazar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolverSolicitudPlantillaDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ISolicitudPlantilla> {
    return this.service.rechazar(id, this.sesionDe(req), dto.comentario);
  }

  /**
   * Entrega el PDF de justificación a quien corresponde.
   *
   * No se sirve desde `/uploads` porque ese estático no exige sesión: el
   * archivo sería descargable por cualquiera que conociera la URL. Es el mismo
   * agujero que ya se cerró para las firmas manuscritas.
   *
   * `no-store` evita que el documento quede en la caché del navegador de una
   * máquina compartida, que en una I.E. es lo habitual.
   */
  @Get(':id/justificacion')
  @RequirePermissions('monitoreo:read')
  @Header('Cache-Control', 'private, no-store')
  async justificacion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');

    const guardada = await this.service.rutaDeJustificacion(id, {
      userId: req.user.sub,
      esGestor: req.user.permissions?.includes('solicitudes_plantilla:gestionar') ?? false,
      institucionId: req.user.institucion_id ?? req.user.colegio_id ?? null,
    });

    return this.streamDelPdf(guardada);
  }

  /**
   * Lee el archivo desde `uploads/`, sin salirse del directorio.
   *
   * `basename` descarta cualquier separador de ruta que hubiera quedado
   * guardado, y la comprobación posterior confirma que la ruta resuelta sigue
   * dentro de la raíz. Un `..` en la base no debería poder leer el `.env`.
   */
  private async streamDelPdf(rutaGuardada: string): Promise<StreamableFile> {
    const raiz = path.resolve(process.cwd(), 'uploads');
    const absoluta = path.resolve(raiz, path.basename(rutaGuardada));

    if (!absoluta.startsWith(raiz + path.sep)) {
      throw new NotFoundException('Justificación no encontrada.');
    }

    try {
      await access(absoluta);
    } catch {
      throw new NotFoundException('Justificación no encontrada.');
    }

    return new StreamableFile(createReadStream(absoluta), { type: 'application/pdf' });
  }

  private sesionDe(req: AuthenticatedRequest): SessionUser {
    if (!req.user) throw new ForbiddenException('Sesión no encontrada.');
    return {
      id: req.user.sub,
      role: req.user.role,
      institucionId: req.user.institucion_id ?? req.user.colegio_id ?? null,
    };
  }
}
