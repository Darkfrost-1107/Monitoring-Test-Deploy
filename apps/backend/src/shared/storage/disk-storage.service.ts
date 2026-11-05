import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, promises as fs } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';
import { StorageBucket, StoragePutResult, StorageService } from './storage.constants.js';

@Injectable()
export class DiskStorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(DiskStorageService.name);
  private readonly basePath: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.basePath = this.config.get<string>('UPLOADS_BASE_PATH', './uploads');
    this.publicBaseUrl = this.config.get<string>('UPLOADS_PUBLIC_URL', '/uploads');
  }

  onModuleInit() {
    for (const bucket of [
      'planes',
      'reprogramaciones',
      'evidencias',
      'sustentos-excepcionales',
    ] as StorageBucket[]) {
      const dir = this.getBucketPath(bucket);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.log(`Created storage directory: ${dir}`);
      }
    }
  }

  async savePdf(
    bucket: StorageBucket,
    originalName: string,
    buffer: Buffer,
  ): Promise<StoragePutResult> {
    const ext = extname(originalName).toLowerCase() || '.pdf';
    const filename = `${bucket}-${randomUUID()}${ext}`;
    const dir = this.getBucketPath(bucket);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const dest = join(dir, filename);
    await fs.writeFile(dest, buffer);

    const relativePath = `/${bucket}/${filename}`;
    return {
      url: relativePath,
      filename,
      size: buffer.length,
      mimeType: 'application/pdf',
    };
  }

  async delete(relativePath: string): Promise<void> {
    const absolute = this.resolveAbsolutePath(relativePath);
    if (existsSync(absolute)) {
      await fs.unlink(absolute);
      this.logger.log(`Deleted file: ${absolute}`);
    }
  }

  getPublicUrl(relativePath: string): string {
    if (relativePath.startsWith('http')) return relativePath;
    const clean = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${this.publicBaseUrl}${clean}`;
  }

  resolveAbsolutePath(relativePath: string): string {
    if (relativePath.startsWith('http')) {
      const url = new URL(relativePath);
      return url.pathname;
    }
    const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return pathResolve(this.basePath, clean);
  }

  private getBucketPath(bucket: StorageBucket): string {
    return pathResolve(this.basePath, bucket);
  }
}
