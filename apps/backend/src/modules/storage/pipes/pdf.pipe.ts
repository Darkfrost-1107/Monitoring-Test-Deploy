import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validación del PDF de justificación de una solicitud de plantilla.
 *
 * El archivo lo sube el director de una I.E. y lo abre el Jefe de Gestión desde
 * el navegador para decidir. Eso lo convierte en contenido que una persona
 * carga y otra ejecuta, con el mismo cuidado que merece cualquier subida.
 *
 * ── Por qué no alcanza mirar la extensión ni el `mimetype` ──
 * Los dos los declara quien envía. Un archivo llamado `justificacion.pdf`, con
 * `mimetype: application/pdf`, puede contener HTML con script adentro; si el
 * servidor lo sirve tal cual, el navegador lo interpreta. La comprobación que
 * vale es la del contenido: todo PDF empieza con la firma `%PDF-`.
 *
 * Es el mismo razonamiento que ya aplica `SharpImagePipe` con las imágenes de
 * firma, donde la barrera real es que la biblioteca decodifique el archivo.
 */

/**
 * Tope de tamaño del justificante.
 *
 * El techo de verdad lo pone `limits: { fileSize }` en el `FileInterceptor`, que
 * corta la transferencia. Cuando este pipe corre el archivo ya está en memoria,
 * de modo que esta comprobación es la segunda capa.
 */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Firma con la que empieza todo PDF, según su especificación. */
const FIRMA_PDF = '%PDF-';

@Injectable()
export class PdfPipe implements PipeTransform<Express.Multer.File, Buffer> {
  transform(archivo: Express.Multer.File): Buffer {
    if (!archivo?.buffer || archivo.buffer.length === 0) {
      throw new BadRequestException('No se envió ningún archivo.');
    }

    if (archivo.buffer.length > MAX_PDF_BYTES) {
      throw new BadRequestException(
        `El documento no puede superar los ${MAX_PDF_BYTES / (1024 * 1024)} MB.`,
      );
    }

    const inicio = archivo.buffer.subarray(0, FIRMA_PDF.length).toString('latin1');
    if (inicio !== FIRMA_PDF) {
      throw new BadRequestException(
        'El archivo no es un PDF. Adjunte la justificación en formato PDF.',
      );
    }

    return archivo.buffer;
  }
}
