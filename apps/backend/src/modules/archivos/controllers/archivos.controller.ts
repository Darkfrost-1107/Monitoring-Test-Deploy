import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import * as path from 'node:path';
import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { rutaDeArchivo } from '../../../shared/storage/ruta-de-archivo.js';

/**
 * Entrega los archivos de `uploads/` a una sesión válida.
 *
 * ── Por qué existe ──
 * Antes se servían con `express.static`, que no pide sesión: cualquiera que
 * conociera la URL se llevaba una evidencia de monitoreo o el sustento de una
 * reprogramación. Y encima no funcionaban: las rutas guardadas son relativas
 * (`/uploads/...`), el navegador las resolvía contra el frontend, y ni nginx ni
 * Vite las reenvían al backend. La imagen salía rota y el enlace abría la
 * aplicación.
 *
 * ── Hasta dónde llega esta autorización, y hasta dónde no ──
 * Exige sesión y la capacidad base de monitoreo. NO comprueba que el archivo
 * pertenezca a una ficha que esta persona pueda ver: para eso habría que
 * remontar de cada archivo a su ficha o a su solicitud, y hoy no hay índice que
 * lo permita sin recorrer tablas.
 *
 * Es una mejora acotada y conviene decirlo: se pasó de «cualquiera en internet»
 * a «cualquier usuario del sistema que además adivine un UUID». Cerrar el
 * alcance por recurso queda pendiente, y las firmas ya muestran cómo se hace.
 */
@Controller('archivos')
@UseGuards(AuthGuard, PermissionsGuard)
export class ArchivosController {
  private readonly raiz: string;

  constructor(config: ConfigService) {
    this.raiz = path.resolve(config.get<string>('UPLOADS_BASE_PATH', './uploads'));
  }

  /**
   * Un archivo de un cajón conocido.
   *
   * `no-store` mantiene el documento fuera de la caché del navegador: en una
   * I.E. la máquina suele ser compartida.
   */
  @Get(':cajon/:nombre')
  @RequirePermissions('monitoreo:read')
  @Header('Cache-Control', 'private, no-store')
  async descargar(
    @Param('cajon') cajon: string,
    @Param('nombre') nombre: string,
  ): Promise<StreamableFile> {
    const absoluta = rutaDeArchivo(this.raiz, cajon, nombre);
    // Un cajón inventado y un archivo inexistente se responden igual: quien
    // prueba rutas no debe poder distinguirlos.
    if (!absoluta) throw new NotFoundException('Archivo no encontrado.');

    try {
      await access(absoluta);
    } catch {
      throw new NotFoundException('Archivo no encontrado.');
    }

    return new StreamableFile(createReadStream(absoluta), { type: tipoDe(absoluta) });
  }
}

/**
 * Tipo de contenido según la extensión.
 *
 * Se declara explícito y acotado en vez de adivinar: un tipo abierto permitiría
 * servir un archivo como `text/html`, y el navegador ejecutaría lo que trajera
 * adentro. Lo desconocido baja como binario.
 */
function tipoDe(ruta: string): string {
  const TIPOS: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return TIPOS[path.extname(ruta).toLowerCase()] ?? 'application/octet-stream';
}
