import { BadRequestException } from '@nestjs/common';
import { MAX_PDF_BYTES, PdfPipe } from './pdf.pipe.js';

/**
 * Pruebas de la validación del PDF de justificación.
 *
 * El archivo lo sube el director de una I.E. y lo abre el Jefe de Gestión desde
 * el navegador. `mimetype` y la extensión los declara quien envía y se
 * falsifican sin esfuerzo, de modo que la única comprobación que vale es la del
 * contenido: un PDF real empieza con `%PDF-`.
 *
 * El mismo razonamiento que ya aplica `SharpImagePipe` con las imágenes de
 * firma, donde la barrera real es que la biblioteca decodifique el archivo.
 */

const archivo = (over: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'justificacion.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.7\n resto del documento'),
    ...over,
  }) as Express.Multer.File;

describe('PdfPipe', () => {
  const pipe = new PdfPipe();

  it('acepta un PDF real', () => {
    expect(pipe.transform(archivo())).toBeInstanceOf(Buffer);
  });

  it('rechaza que no venga archivo', () => {
    expect(() => pipe.transform(undefined as unknown as Express.Multer.File)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un archivo que dice ser PDF pero no lo es', () => {
    // El caso que importa: extensión y mimetype correctos, contenido ejecutable.
    const disfrazado = archivo({
      originalname: 'justificacion.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('MZ\x90\x00 ejecutable de Windows'),
    });

    expect(() => pipe.transform(disfrazado)).toThrow(/no es un PDF/i);
  });

  it('rechaza HTML disfrazado, que el navegador podría ejecutar al abrirlo', () => {
    const html = archivo({ buffer: Buffer.from('<html><script>alert(1)</script></html>') });

    expect(() => pipe.transform(html)).toThrow(BadRequestException);
  });

  it('rechaza un archivo vacío', () => {
    expect(() => pipe.transform(archivo({ buffer: Buffer.alloc(0), size: 0 }))).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un archivo más grande que el tope', () => {
    const enorme = archivo({
      buffer: Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(MAX_PDF_BYTES)]),
      size: MAX_PDF_BYTES + 8,
    });

    expect(() => pipe.transform(enorme)).toThrow(/MB/);
  });

  it('no se deja engañar por la extensión cuando el contenido sí es PDF', () => {
    // Al revés: el contenido manda. Un PDF con nombre raro se acepta.
    const raro = archivo({ originalname: 'documento', mimetype: 'application/octet-stream' });

    expect(pipe.transform(raro)).toBeInstanceOf(Buffer);
  });
});
