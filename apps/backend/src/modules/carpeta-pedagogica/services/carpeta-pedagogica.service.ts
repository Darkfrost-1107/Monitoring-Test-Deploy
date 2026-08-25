import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ANIO_ESCOLAR_INICIAL,
  anioEscolarVigente,
  type ICarpetaPedagogica,
  type ICarpetaPedagogicaResponse,
} from '@sistema-monitoreo/shared-contracts';
import {
  esEnlaceDriveValido,
  normalizarEnlaceDrive,
} from '@sistema-monitoreo/shared-validation/enlace-drive';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Carpeta pedagógica — enlace al portafolio del docente en Google Drive.
 *
 * El sistema guarda la referencia, no los archivos. Un enlace por docente y por
 * año escolar.
 *
 * ── La regla que sostiene este servicio ──
 * Tener `carpeta_pedagogica:write` habilita la pantalla; no autoriza a escribir
 * sobre la carpeta de otra persona. Por eso ningún método de escritura recibe
 * un `docenteId`: lo resuelve desde el usuario de la sesión. Es la misma
 * distinción entre identidad y capacidad que ya aplica el llenado de la ficha,
 * donde el monitor asignado —y no cualquiera con permiso de monitoreo— es quien
 * puede escribir.
 *
 * Se resuelve contra la base y no desde el `docente_id` del token a propósito:
 * un token emitido antes de que la persona quedara registrada como docente lo
 * trae vacío, y renovar la sesión no debería ser requisito para usar la
 * pantalla.
 */

/** Tope de la nota del docente, en línea con la columna de la base. */
const LARGO_MAXIMO_DESCRIPCION = 500;

interface GuardarCarpeta {
  anioEscolar: number;
  url: string;
  descripcion?: string;
}

type CarpetaFila = {
  id: string;
  docenteId: string;
  anioEscolar: number;
  url: string;
  descripcion: string | null;
  updatedAt: Date;
  actualizadoPor: { persona: { nombres: string; apellidos: string } } | null;
};

/** Datos del autor que se exponen: el nombre, nunca el identificador de usuario. */
const AUTOR_SELECT = {
  actualizadoPor: { select: { persona: { select: { nombres: true, apellidos: true } } } },
} as const;

@Injectable()
export class CarpetaPedagogicaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra o reemplaza el enlace del año indicado, siempre para el docente de la sesión. */
  async guardarPropia(usuarioId: string, dto: GuardarCarpeta): Promise<ICarpetaPedagogica> {
    const docenteId = await this.docenteDeLaSesion(usuarioId);
    const anioEscolar = this.anioValidado(dto.anioEscolar);
    const url = this.enlaceValidado(dto.url);
    const descripcion = this.descripcionValidada(dto.descripcion);

    const fila = await this.prisma.carpetaPedagogica.upsert({
      where: { docenteId_anioEscolar: { docenteId, anioEscolar } },
      create: { docenteId, anioEscolar, url, descripcion, actualizadoPorId: usuarioId },
      update: { url, descripcion, actualizadoPorId: usuarioId },
      include: AUTOR_SELECT,
    });

    return this.aContrato(fila);
  }

  /** Enlace del docente de la sesión para un año. `null` si todavía no registró ninguno. */
  async obtenerPropia(usuarioId: string, anioEscolar: number): Promise<ICarpetaPedagogicaResponse> {
    const docenteId = await this.docenteDeLaSesion(usuarioId);
    return this.buscar(docenteId, this.anioValidado(anioEscolar));
  }

  /** Enlace de un docente cualquiera, para quien lo monitorea. */
  async obtenerDeDocente(
    docenteId: string,
    anioEscolar: number,
  ): Promise<ICarpetaPedagogicaResponse> {
    const docente = await this.prisma.docente.findUnique({
      where: { id: docenteId },
      select: { id: true },
    });
    if (!docente) throw new NotFoundException('Docente no encontrado.');

    return this.buscar(docenteId, this.anioValidado(anioEscolar));
  }

  /** Retira el enlace del año indicado. Sin efecto si no había ninguno. */
  async eliminarPropia(usuarioId: string, anioEscolar: number): Promise<void> {
    const docenteId = await this.docenteDeLaSesion(usuarioId);
    await this.prisma.carpetaPedagogica.deleteMany({
      where: { docenteId, anioEscolar: this.anioValidado(anioEscolar) },
    });
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private async buscar(
    docenteId: string,
    anioEscolar: number,
  ): Promise<ICarpetaPedagogicaResponse> {
    const fila = await this.prisma.carpetaPedagogica.findUnique({
      where: { docenteId_anioEscolar: { docenteId, anioEscolar } },
      include: AUTOR_SELECT,
    });

    // Que no haya enlace es una ausencia esperada —el año recién arranca—, no un
    // error: devolver 404 obligaría al cliente a tratar lo normal como excepción.
    return { carpeta: fila ? this.aContrato(fila) : null };
  }

  /**
   * Docente asociado al usuario de la sesión.
   *
   * Es el único punto donde se decide sobre qué carpeta se escribe. Quien no
   * tiene registro de docente no tiene carpeta pedagógica que registrar.
   */
  private async docenteDeLaSesion(usuarioId: string): Promise<string> {
    const docente = await this.prisma.docente.findFirst({
      where: { persona: { usuario: { id: usuarioId } } },
      select: { id: true },
    });
    if (!docente) {
      throw new ForbiddenException('Sólo un docente puede registrar su carpeta pedagógica.');
    }
    return docente.id;
  }

  /**
   * Enlace validado en el servidor.
   *
   * La validación del formulario es comodidad para quien completa; ésta es el
   * control. Comparte la implementación con el frontend (`shared-validation`)
   * para que la lista blanca de hosts no pueda divergir entre los dos lados.
   */
  private enlaceValidado(valor: string): string {
    const url = normalizarEnlaceDrive(valor ?? '');
    if (!esEnlaceDriveValido(url)) {
      throw new BadRequestException(
        'El enlace debe ser una URL https de Google Drive o Google Docs.',
      );
    }
    return url;
  }

  /**
   * Año escolar validado contra el mismo rango que ofrece el selector.
   *
   * El tope es el año EN CURSO. Que la pantalla no ofrezca años futuros no
   * alcanza: el `select` es una comodidad, y una petición armada a mano llega
   * igual. Sin este control, un enlace podría quedar archivado contra un año
   * que todavía no empezó, fuera del alcance de cualquier monitoreo y sin que
   * nadie lo advierta hasta que ese año llegue.
   *
   * El rango sale del contrato compartido y no de constantes paralelas: un
   * servidor que aceptara años que la pantalla no ofrece dejaría filas que
   * después nadie puede consultar.
   */
  private anioValidado(anio: number): number {
    const vigente = anioEscolarVigente(new Date().getFullYear());
    if (!Number.isInteger(anio) || anio < ANIO_ESCOLAR_INICIAL || anio > vigente) {
      throw new BadRequestException(
        `El año escolar debe estar entre ${ANIO_ESCOLAR_INICIAL} y ${vigente}.`,
      );
    }
    return anio;
  }

  private descripcionValidada(valor: string | undefined): string | null {
    const texto = valor?.trim();
    if (!texto) return null;
    if (texto.length > LARGO_MAXIMO_DESCRIPCION) {
      throw new BadRequestException(
        `La descripción no puede superar los ${LARGO_MAXIMO_DESCRIPCION} caracteres.`,
      );
    }
    return texto;
  }

  private aContrato(fila: CarpetaFila): ICarpetaPedagogica {
    const autor = fila.actualizadoPor?.persona;
    return {
      id: fila.id,
      docenteId: fila.docenteId,
      anioEscolar: fila.anioEscolar,
      url: fila.url,
      descripcion: fila.descripcion,
      actualizadoEn: fila.updatedAt.toISOString(),
      actualizadoPor: autor ? `${autor.nombres} ${autor.apellidos}`.trim() : null,
    };
  }
}
