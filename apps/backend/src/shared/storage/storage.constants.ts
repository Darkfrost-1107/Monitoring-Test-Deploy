export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export type StorageBucket =
  | 'planes'
  | 'reprogramaciones'
  | 'evidencias'
  | 'sustentos-excepcionales';

export interface StoragePutResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface StorageService {
  savePdf(bucket: StorageBucket, originalName: string, buffer: Buffer): Promise<StoragePutResult>;
  delete(relativePath: string): Promise<void>;
  getPublicUrl(relativePath: string): string;
  resolveAbsolutePath(relativePath: string): string;
}
