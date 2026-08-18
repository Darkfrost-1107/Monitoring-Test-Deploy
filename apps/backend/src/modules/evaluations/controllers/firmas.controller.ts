/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Query,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { SharpImagePipe, MAX_FIRMA_BYTES } from '../../storage/pipes/sharp-image.pipe.js';
import { StorageService } from '../../storage/storage.service.js';
import { SignFichaDto } from '../dto/firma.dto.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import type { ScopeContext } from '../../../shared/auth/scope-filter.js';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.js';
import {
  condicionDeFicha,
  debeFinalizarse,
  elDirectorFirma,
  resolverFicha,
  rolFirmanteDe,
  rutaDeImagenDeFirma,
  RUTA_DE_MI_FIRMA,
  type PartesDeLaVisita,
  type RolFirmante,
} from '../services/firmas.helper.js';

/**
 * Firmas estampadas en las fichas de monitoreo.
 *
 * ── Qué cambió en autorización ──
 * El controlador tenía `@UseGuards(AuthGuard)` a secas: ninguna capacidad
 * exigida y ningún filtro de alcance. `GET :id/firmas` devolvía las firmas de
 * CUALQUIER ficha a cualquier sesión, mientras el resto del módulo declara
 * `@RequirePermissions` en trece endpoints y las lecturas de fichas pasan por
 * `ScopeFilter.forFicha`.
 *
 * Ahora se suma `PermissionsGuard` —sin él el decorador no se aplica— y todas
 * las consultas de ficha llevan el filtro de alcance, que es lo que de verdad
 * acota: `monitoreo:read` está en `BASE_CAPABILITIES` y por lo tanto lo tiene
 * toda persona.
 *
 * ── Qué cambió en la imagen ──
 * `imagenUrl` devolvía la ruta del archivo en `uploads/`, que `main.ts` publica
 * con `express.static` sin autenticación. Ahora se devuelve una ruta que pasa
 * por acá y hereda el mismo alcance.
 */
@Controller('fichas')
@UseGuards(AuthGuard, PermissionsGuard)
export class FirmasController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly scopeFilter: ScopeFilter,
  ) {}

  private contextoDeAlcance(req: AuthenticatedRequest): ScopeContext {
    if (!req.user) throw new ForbiddenException('Sesion no encontrada.');

    return {
      userId: req.user.sub,
      role: req.user.role,
      institucionId: req.user.institucion_id ?? null,
      especialistaNivel: req.user.especialista_nivel ?? null,
    };
  }

  /**
   * La ficha, sólo si quien pregunta puede verla, y sólo si es UNA.
   *
   * Acepta el id de la ficha o el del cronograma, como venía haciendo. El filtro
   * de alcance se suma con `AND` para que ningún id ajeno se resuelva.
   *
   * ── Por qué `findMany` y no `findFirst` ──
   * Un `cronogramaId` puede corresponder a dos fichas desde que una visita
   * docente lleva la ficha regular y la EIB. `findFirst` devolvía una arbitraria
   * y el código seguía como si fuera la correcta. Ahora se traen todas las que el
   * alcance permite y la ambigüedad se responde, no se resuelve a la suerte:
   * quien llama tiene que indicar `plantillaId`.
   */
  private async fichaVisible(
    idFichaOCronograma: string,
    plantillaId: string | undefined,
    req: AuthenticatedRequest,
  ): Promise<{ id: string; partes: PartesDeLaVisita } | null> {
    const fichas = await this.prisma.fichaMonitoreo.findMany({
      where: {
        AND: [
          condicionDeFicha(idFichaOCronograma, plantillaId),
          this.scopeFilter.forFicha(this.contextoDeAlcance(req)),
        ],
      },
      select: {
        id: true,
        plantilla: { select: { tipoMonitoreo: true } },
        cronograma: {
          select: {
            evaluado: { select: { personaId: true } },
            monitor: { select: { personaId: true } },
            /**
             * El director de la I.E. no es parte del cronograma: se lo ubica por
             * su cargo activo en la institución de la visita, igual que hacen
             * `institucion-director.helper` y las notificaciones.
             */
            institucion: {
              select: {
                docentes: {
                  where: {
                    docenteCargos: { some: { cargo: { nombre: 'Director' }, fechaFin: null } },
                  },
                  select: { personaId: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const resolucion = resolverFicha(fichas);

    if (resolucion.estado === 'ninguna') return null;
    if (resolucion.estado === 'ambigua') {
      throw new BadRequestException(
        `Esta visita tiene ${resolucion.cantidad} fichas: indique la plantilla del instrumento para identificarla.`,
      );
    }

    const { ficha } = resolucion;
    const director = ficha.cronograma.institucion?.docentes[0] ?? null;

    return {
      id: ficha.id,
      partes: {
        evaluado: ficha.cronograma.evaluado,
        monitor: ficha.cronograma.monitor,
        // En la ficha directiva el director ES el evaluado: no se le suma un
        // segundo rol.
        director: elDirectorFirma(ficha.plantilla?.tipoMonitoreo ?? 'DOCENTE') ? director : null,
      },
    };
  }

  /**
   * Sube o actualiza la firma del usuario logueado.
   *
   * ── Por qué el límite va acá ──
   * `FileInterceptor('firma')` estaba sin opciones: Multer guarda en memoria y
   * sin `limits` no hay techo, así que una sesión podía enviar un archivo de
   * cualquier tamaño y agotar la memoria del proceso antes de que ninguna
   * validación corriera. `PLAN_FIRMAS.md` pedía 2 MB y había quedado sin hacer.
   */
  @Put('me/firma')
  @RequirePermissions('monitoreo:read')
  @UseInterceptors(FileInterceptor('firma', { limits: { fileSize: MAX_FIRMA_BYTES, files: 1 } }))
  async uploadFirma(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(SharpImagePipe) imageBuffer: Buffer,
  ) {
    const userId = this.contextoDeAlcance(req).userId;

    const rutaEnDisco = await this.storageService.saveSignature(imageBuffer);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { firmaUrl: rutaEnDisco },
    });

    // Se devuelve la ruta autenticada, no la del archivo: el cliente la usa
    // directamente para mostrar la firma.
    return {
      success: true,
      message: 'Firma actualizada correctamente',
      firmaUrl: RUTA_DE_MI_FIRMA,
    };
  }

  /** Indica si el usuario tiene firma configurada, sin exponer su ruta en disco. */
  @Get('me/firma')
  @RequirePermissions('monitoreo:read')
  async getCurrentFirma(@Req() req: AuthenticatedRequest) {
    const userId = this.contextoDeAlcance(req).userId;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { firmaUrl: true },
    });

    return {
      firmaUrl: usuario?.firmaUrl ? RUTA_DE_MI_FIRMA : null,
    };
  }

  /** La imagen de la firma propia. Cada persona sólo alcanza la suya. */
  @Get('me/firma/imagen')
  @RequirePermissions('monitoreo:read')
  @Header('Cache-Control', 'private, no-store')
  async getMiFirmaImagen(@Req() req: AuthenticatedRequest): Promise<StreamableFile> {
    const userId = this.contextoDeAlcance(req).userId;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { firmaUrl: true },
    });

    return this.streamDeFirma(usuario?.firmaUrl);
  }

  /**
   * Obtiene todas las firmas estampadas en una ficha.
   * Acepta tanto el ID de la ficha como el ID del cronograma.
   */
  @Get(':id/firmas')
  @RequirePermissions('monitoreo:read')
  async getFirmasDeFicha(
    @Param('id', ParseUUIDPipe) fichaOrCronogramaId: string,
    @Req() req: AuthenticatedRequest,
    @Query('plantillaId', new ParseUUIDPipe({ optional: true })) plantillaId?: string,
  ) {
    const ficha = await this.fichaVisible(fichaOrCronogramaId, plantillaId, req);

    if (!ficha) {
      return { firmas: [] };
    }

    const firmas = await this.prisma.fichaFirma.findMany({
      where: { fichaId: ficha.id },
      select: {
        rolFirmante: true,
        imagenUrl: true,
        createdAt: true,
      },
    });

    return {
      firmas: firmas.map((firma) => ({
        rolFirmante: firma.rolFirmante,
        // Nunca la ruta del archivo: `uploads/` se publica sin autenticación.
        imagenUrl: firma.imagenUrl
          ? rutaDeImagenDeFirma(ficha.id, firma.rolFirmante as RolFirmante)
          : null,
        createdAt: firma.createdAt,
      })),
    };
  }

  /** La imagen de una firma estampada, con el mismo alcance que la ficha. */
  @Get(':id/firmas/:rol/imagen')
  @RequirePermissions('monitoreo:read')
  @Header('Cache-Control', 'private, no-store')
  async getImagenDeFirma(
    @Param('id', ParseUUIDPipe) fichaOrCronogramaId: string,
    @Param('rol') rol: string,
    @Req() req: AuthenticatedRequest,
    @Query('plantillaId', new ParseUUIDPipe({ optional: true })) plantillaId?: string,
  ): Promise<StreamableFile> {
    const ficha = await this.fichaVisible(fichaOrCronogramaId, plantillaId, req);
    if (!ficha) throw new NotFoundException('Firma no encontrada.');

    const firma = await this.prisma.fichaFirma.findFirst({
      where: { fichaId: ficha.id, rolFirmante: rol.toUpperCase() },
      select: { imagenUrl: true },
    });

    return this.streamDeFirma(firma?.imagenUrl);
  }

  /**
   * Abre el archivo de una firma a partir de la ruta guardada.
   *
   * La ruta viene de la base y nunca del cliente, pero se resuelve contra el
   * directorio de subidas y se comprueba que no lo abandone: una ruta con `..`
   * en la fila permitiría leer cualquier archivo del servidor.
   */
  private async streamDeFirma(rutaGuardada: string | null | undefined): Promise<StreamableFile> {
    if (!rutaGuardada) throw new NotFoundException('Firma no encontrada.');

    const raiz = path.resolve(process.cwd(), 'uploads');
    const absoluta = path.resolve(raiz, path.basename(rutaGuardada));

    if (!absoluta.startsWith(raiz + path.sep)) {
      throw new NotFoundException('Firma no encontrada.');
    }

    try {
      await access(absoluta);
    } catch {
      throw new NotFoundException('Firma no encontrada.');
    }

    return new StreamableFile(createReadStream(absoluta), { type: 'image/png' });
  }

  @Post(':id/firmas')
  @RequirePermissions('monitoreo:read')
  async signFicha(
    @Param('id', ParseUUIDPipe) fichaOrCronogramaId: string,
    @Body() dto: SignFichaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.contextoDeAlcance(req).userId;

    if (!dto.consentimiento) {
      throw new BadRequestException('Debe aceptar el consentimiento para firmar.');
    }

    // 1. Verificar que el usuario tenga una firma configurada
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { firmaUrl: true, personaId: true },
    });

    if (!usuario?.firmaUrl) {
      throw new BadRequestException(
        'Debe configurar su firma en el perfil antes de firmar la ficha.',
      );
    }

    /**
     * Se resuelve con el mismo criterio que las lecturas: una sola ficha o un
     * error. Firmar la ficha equivocada es peor que no firmar, porque la firma
     * atesta el contenido de un instrumento concreto.
     */
    const ficha = await this.fichaVisible(fichaOrCronogramaId, dto.plantillaId, req);

    if (!ficha) {
      throw new BadRequestException('No se encontró la ficha de monitoreo para esta visita.');
    }

    /**
     * El rol sale de la persona autenticada, NUNCA de `dto.rolFirmante`.
     * El cuerpo declara ese campo y el cliente lo envía, pero aceptarlo dejaría
     * firmar como la contraparte. La regla vive en `firmas.helper.ts`, con
     * pruebas.
     */
    const rolFirmante = rolFirmanteDe(usuario.personaId, ficha.partes);

    if (!rolFirmante) {
      throw new ForbiddenException(
        'Solo el evaluador o el evaluado asignados a esta ficha tienen la potestad de firmarla.',
      );
    }

    try {
      const firma = await this.prisma.fichaFirma.create({
        data: {
          fichaId: ficha.id,
          firmanteId: userId,
          rolFirmante,
          imagenUrl: usuario.firmaUrl,
          ipAddress: req.ip || '0.0.0.0',
        },
      });

      /**
       * 3. Revisar si con esta firma la ficha ya puede pasar a FINALIZADO.
       *
       * Se leen los roles y no la cantidad: la firma del director de la I.E.
       * llega después, como visto bueno, y contar la haría cerrar la ficha sin la
       * del docente. La regla vive en `firmas.helper.ts`, con pruebas.
       */
      const firmadas = await this.prisma.fichaFirma.findMany({
        where: { fichaId: ficha.id },
        select: { rolFirmante: true },
      });

      if (debeFinalizarse(firmadas.map((f) => f.rolFirmante))) {
        await this.prisma.fichaMonitoreo.update({
          where: { id: ficha.id },
          data: { estado: 'FINALIZADO' },
        });
      }

      return {
        success: true,
        message: 'Ficha firmada con éxito',
        firmaId: firma.id,
        rolFirmante,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Ya firmó esta ficha con este rol.');
      }
      throw error;
    }
  }
}
