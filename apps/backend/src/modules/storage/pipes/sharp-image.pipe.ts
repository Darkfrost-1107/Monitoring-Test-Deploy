import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class SharpImagePipe implements PipeTransform<Express.Multer.File, Promise<Buffer>> {
  async transform(image: Express.Multer.File): Promise<Buffer> {
    if (!image) {
      throw new BadRequestException('No se envió ningún archivo');
    }

    // Validar tipo de archivo (Multer ya debió hacerlo, pero reforzamos)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException('Solo se permiten imágenes (PNG, JPEG, WEBP)');
    }

    try {
      // 1. Tomamos el buffer en memoria que dejó Multer
      // 2. Usamos sharp para redimensionar y limpiar la imagen
      // Max 800x400 para firmas, manteniendo aspect ratio
      // Lo forzamos a PNG para soportar transparencias si viniera en WEBP
      const processedBuffer = await sharp(image.buffer)
        .resize({ width: 800, height: 400, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, effort: 7 })
        .toBuffer();

      return processedBuffer;
    } catch {
      throw new BadRequestException('El archivo enviado no es una imagen válida o está dañado.');
    }
  }
}
