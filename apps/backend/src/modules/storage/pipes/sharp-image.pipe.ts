import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/**
 * Tamaño máximo de una imagen de firma.
 *
 * El techo de verdad lo pone `limits: { fileSize }` en el `FileInterceptor`: ahí
 * Multer corta la transferencia. Cuando este pipe corre, el archivo ya está
 * entero en memoria, de modo que la comprobación de acá es la segunda capa —vale
 * si alguien monta el pipe sin declarar el límite en el interceptor—.
 */
export const MAX_FIRMA_BYTES = 2 * 1024 * 1024;

/** Píxeles máximos que se aceptan antes de redimensionar. */
const MAX_PIXELES = 8000 * 8000;

@Injectable()
export class SharpImagePipe implements PipeTransform<Express.Multer.File, Promise<Buffer>> {
  async transform(image: Express.Multer.File): Promise<Buffer> {
    if (!image) {
      throw new BadRequestException('No se envió ningún archivo');
    }

    // Validar tipo de archivo (Multer ya debió hacerlo, pero reforzamos).
    // `mimetype` lo declara el cliente y se falsifica sin esfuerzo: la barrera
    // real es que sharp decodifique y re-codifique la imagen más abajo.
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException('Solo se permiten imágenes (PNG, JPEG, WEBP)');
    }

    if (image.size > MAX_FIRMA_BYTES) {
      throw new BadRequestException('La firma no puede superar los 2 MB.');
    }

    try {
      // 1. Tomamos el buffer en memoria que dejó Multer
      // 2. Usamos sharp para redimensionar y limpiar la imagen
      // Max 800x400 para firmas, manteniendo aspect ratio
      // Lo forzamos a PNG para soportar transparencias si viniera en WEBP
      //
      // `limitInputPixels` acota la bomba de descompresión: un PNG de pocos
      // kilobytes puede declarar decenas de miles de píxeles por lado y agotar
      // la memoria al decodificarse, que el límite de bytes no detiene.
      const processedBuffer = await sharp(image.buffer, { limitInputPixels: MAX_PIXELES })
        .resize({ width: 800, height: 400, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, effort: 7 })
        .toBuffer();

      return processedBuffer;
    } catch {
      throw new BadRequestException('El archivo enviado no es una imagen válida o está dañado.');
    }
  }
}
