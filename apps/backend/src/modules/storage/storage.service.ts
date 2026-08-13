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
   * Guarda un buffer de imagen en el disco local y devuelve su URL relativa.
   * En producción, esto debería reemplazarse por la carga a un bucket S3.
   */
  async saveSignature(buffer: Buffer): Promise<string> {
    const fileName = `firma-${randomUUID()}.png`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    // Retornamos una URL relativa o pública según se sirvan los estáticos
    return `/uploads/${fileName}`;
  }
}
