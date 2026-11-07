import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    service = new StorageService();
    await service.onModuleInit();
  });

  it('guarda una firma y devuelve un Data URI Base64 para persistencia garantizada', async () => {
    const fakeBuffer = Buffer.from('fake-signature-png-data');
    const result = await service.saveSignature(fakeBuffer);

    expect(result).toMatch(/^data:image\/png;base64,/);
    const base64Content = result.replace('data:image/png;base64,', '');
    expect(Buffer.from(base64Content, 'base64').toString()).toBe('fake-signature-png-data');
  });

  it('sigue guardando PDFs de justificación con ruta /uploads/', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 fake pdf data');
    const result = await service.saveJustificacionPdf(fakePdf);

    expect(result).toMatch(/^\/uploads\/solicitud-plantilla-.*\.pdf$/);
  });
});
