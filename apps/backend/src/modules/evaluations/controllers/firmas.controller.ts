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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { SharpImagePipe } from '../../storage/pipes/sharp-image.pipe.js';
import { StorageService } from '../../storage/storage.service.js';
import { SignFichaDto } from '../dto/firma.dto.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('fichas')
@UseGuards(AuthGuard)
export class FirmasController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sube o actualiza la firma del usuario logueado.
   * En realidad la ruta base es /fichas, pero este endpoint es de utilidad general
   * para el perfil del usuario respecto a sus firmas.
   */
  @Put('me/firma')
  @UseInterceptors(FileInterceptor('firma'))
  async uploadFirma(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(SharpImagePipe) imageBuffer: Buffer,
  ) {
    const userId = req.user.sub; // Suponiendo JWT payload con sub

    // Guardamos usando el storage service (Multer -> Sharp -> Disco)
    const url = await this.storageService.saveSignature(imageBuffer);

    // Actualizamos el usuario en la BD
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { firmaUrl: url },
    });

    return {
      success: true,
      message: 'Firma actualizada correctamente',
      firmaUrl: url,
    };
  }

  /**
   * Obtiene la firma actual del usuario logueado.
   */
  @Get('me/firma')
  async getCurrentFirma(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { firmaUrl: true },
    });
    return {
      firmaUrl: usuario?.firmaUrl || null,
    };
  }

  /**
   * Obtiene todas las firmas estampadas en una ficha.
   * Acepta tanto el ID de la ficha como el ID del cronograma.
   */
  @Get(':id/firmas')
  async getFirmasDeFicha(@Param('id', ParseUUIDPipe) fichaOrCronogramaId: string) {
    const ficha = await this.prisma.fichaMonitoreo.findFirst({
      where: {
        OR: [{ id: fichaOrCronogramaId }, { cronogramaId: fichaOrCronogramaId }],
      },
      select: { id: true },
    });

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

    return { firmas };
  }

  @Post(':id/firmas')
  async signFicha(
    @Param('id', ParseUUIDPipe) fichaOrCronogramaId: string,
    @Body() dto: SignFichaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

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

    // Buscar la ficha junto con el cronograma para determinar el rol correcto
    const ficha = await this.prisma.fichaMonitoreo.findFirst({
      where: {
        OR: [{ cronogramaId: fichaOrCronogramaId }, { id: fichaOrCronogramaId }],
      },
      select: {
        id: true,
        cronograma: {
          select: {
            evaluadoId: true, // ID del Docente evaluado
            monitorId: true, // ID del Especialista evaluador
            evaluado: { select: { personaId: true } },
            monitor: { select: { personaId: true } },
          },
        },
      },
    });

    if (!ficha) {
      throw new BadRequestException('No se encontró la ficha de monitoreo para esta visita.');
    }

    // Determinar el rol basándose en la personaId del usuario firmante,
    // que es la clave que vincula Usuario ↔ Docente/Especialista.
    let rolFirmante: string;
    const personaId = usuario.personaId;

    if (personaId === ficha.cronograma.evaluado?.personaId) {
      rolFirmante = 'EVALUADO';
    } else if (personaId === ficha.cronograma.monitor?.personaId) {
      rolFirmante = 'EVALUADOR';
    } else {
      throw new ForbiddenException(
        'Solo el evaluador o el evaluado asignados a esta ficha tienen la potestad de firmarla.',
      );
    }

    // 2. Insertar la firma en la base de datos
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

      // 3. Revisar si con esta firma la ficha ya puede pasar a FINALIZADO
      const firmasCount = await this.prisma.fichaFirma.count({
        where: { fichaId: ficha.id },
      });

      if (firmasCount >= 2) {
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
