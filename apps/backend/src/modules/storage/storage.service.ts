import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async onModuleInit() {
    await this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Guarda un buffer de imagen en el disco local (si está disponible) y devuelve
   * su representación en Data URI Base64 para persistencia garantizada en la BD.
   * Esto previene la pérdida de firmas en entornos con almacenamiento efímero (sin volúmenes).
   */
  async saveSignature(buffer: Buffer): Promise<string> {
    const fileName = `firma-${randomUUID()}.png`;
    const filePath = path.join(this.uploadDir, fileName);

    try {
      await fs.writeFile(filePath, buffer);
    } catch {
      // Si el directorio no es accesible o el disco es de solo lectura, no bloquea el guardado en BD.
    }

    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Guarda el PDF que justifica una solicitud de plantilla.
   *
   * El nombre lo genera el servidor y nunca reusa el que trajo el archivo: un
   * nombre de origen puede llevar separadores de ruta y salirse del directorio
   * de subidas. Además evita que dos instituciones se pisen un archivo.
   *
   * `PdfPipe` ya verificó que el contenido sea realmente un PDF antes de llegar
   * acá.
   */
  async saveJustificacionPdf(buffer: Buffer): Promise<string> {
    const fileName = `solicitud-plantilla-${randomUUID()}.pdf`;
    await fs.writeFile(path.join(this.uploadDir, fileName), buffer);
    return `/uploads/${fileName}`;
  }
}
