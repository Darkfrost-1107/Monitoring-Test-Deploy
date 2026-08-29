import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CargoBeneficiario,
  INSTRUMENTOS_SOLICITABLES,
  type EstadoSolicitudPlantilla,
  type ICrearSolicitudPlantillaRequest,
  type IDestinatarioDeVale,
  type ISolicitudPlantilla,
  type ISolicitudesPlantillaResponse,
  type TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

/**
 * Pedido de una I.E. para poder crear plantillas propias.
 *
 * El catálogo oficial son las tres fichas de la UGEL. Una institución que
 * necesita un instrumento propio lo pide antes con un PDF que lo justifica, y
 * el Jefe de Gestión aprueba o rechaza el paquete completo.
 *
 * ── Por qué sólo el director emite ──
 * En la institución, el Jefe de Taller y el Coordinador Pedagógico le piden al
 * director y él tramita. Es una regla de la organización, no una comodidad de
 * pantalla, y por eso la sostiene el servidor: cada ítem declara para qué cargo
 * es, y el pedido lleva una sola firma.
 */

const CARGOS_VALIDOS: readonly string[] = Object.values(CargoBeneficiario);

/**
 * El cargo que ocupa cada rol de institución.
 *
 * El director elige a la PERSONA; el cargo del ítem se comprueba contra el rol
 * que esa persona tiene registrado. Así el pedido no puede decir «Coordinador
 * Pedagógico» y apuntar al jefe de taller.
 */
const CARGO_POR_ROL: Partial<Record<string, CargoBeneficiario>> = {
  [RoleCode.DIRECTOR_INSTITUCION]: CargoBeneficiario.DIRECTOR,
  [RoleCode.COORDINADOR_PEDAGOGICO]: CargoBeneficiario.COORDINADOR_PEDAGOGICO,
  [RoleCode.JEFE_TALLER]: CargoBeneficiario.JEFE_DE_TALLER,
};

const ROLES_DESTINATARIOS = Object.keys(CARGO_POR_ROL);

/** Fila con lo que la respuesta necesita. */
interface FilaSolicitud {
  id: string;
  institucionId: string;
  anioEscolar: number;
  justificacionUrl: string;
  estado: string;
  comentario: string | null;
  resueltaAt: Date | null;
  createdAt: Date;
  institucion: { nombre: string };
  solicitante: { persona: { nombres: string; apellidos: string } };
  resueltaPor: { persona: { nombres: string; apellidos: string } } | null;
  items: {
    id: string;
    instrumento: string;
    cargoBeneficiario: string;
    descripcion: string;
    plantillaId: string | null;
    beneficiarioId: string | null;
    beneficiario: { persona: { nombres: string; apellidos: string } } | null;
  }[];
}

const INCLUDE = {
  institucion: { select: { nombre: true } },
  solicitante: { select: { persona: { select: { nombres: true, apellidos: true } } } },
  resueltaPor: { select: { persona: { select: { nombres: true, apellidos: true } } } },
  items: {
    select: {
      id: true,
      instrumento: true,
      cargoBeneficiario: true,
      descripcion: true,
      plantillaId: true,
      beneficiarioId: true,
      beneficiario: { select: { persona: { select: { nombres: true, apellidos: true } } } },
    },
  },
} as const;

const nombreDe = (p: { persona: { nombres: string; apellidos: string } } | null): string | null =>
  p ? `${p.persona.nombres} ${p.persona.apellidos}`.trim() : null;

@Injectable()
export class SolicitudesPlantillaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Alta del pedido. El PDF ya fue validado y guardado por el controlador. */
  async crear(
    session: SessionUser,
    dto: ICrearSolicitudPlantillaRequest,
    justificacionUrl: string,
  ): Promise<ISolicitudPlantilla> {
    const institucionId = this.institucionDelDirector(session);
    this.validarItems(dto.items);
    await this.validarDestinatarios(dto.items, institucionId);

    // Dos pedidos abiertos a la vez dejan al Jefe de Gestión decidiendo sobre
    // información que se contradice, y duplican los cupos si aprueba los dos.
    const abierta = await this.prisma.solicitudPlantilla.findFirst({
      where: { institucionId, anioEscolar: dto.anioEscolar, estado: 'PENDIENTE' },
      select: { id: true },
    });
    if (abierta) {
      throw new ConflictException(
        'Su institución ya tiene una solicitud pendiente para ese año. Espere la respuesta de la Jefatura de Gestión.',
      );
    }

    const fila = await this.prisma.solicitudPlantilla.create({
      data: {
        // De qué institución es el pedido lo decide la SESIÓN, nunca el cuerpo.
        institucionId,
        solicitanteId: session.id,
        anioEscolar: dto.anioEscolar,
        justificacionUrl,
        items: {
          create: dto.items.map((i) => ({
            instrumento: i.instrumento,
            cargoBeneficiario: i.cargoBeneficiario,
            beneficiarioId: i.beneficiarioId,
            descripcion: i.descripcion,
          })),
        },
      },
      include: INCLUDE,
    });

    /**
     * El aviso sale del camino de la petición, no dentro.
     *
     * Presentar la solicitud no debe esperar a que salgan los correos, y un
     * fallo del canal de avisos no puede hacer fracasar un pedido que ya quedó
     * guardado.
     */
    this.eventEmitter.emit('solicitud-plantilla.creada', { solicitudId: fila.id });

    return this.aContrato(fila);
  }

  /** Bandeja del Jefe de Gestión. */
  async listar(estado?: string): Promise<ISolicitudesPlantillaResponse> {
    return this.buscar(estado ? { estado } : {}, estado);
  }

  /** Seguimiento de los pedidos de la propia institución. */
  async mias(session: SessionUser, estado?: string): Promise<ISolicitudesPlantillaResponse> {
    const institucionId = this.institucionDelDirector(session);
    return this.buscar({ institucionId, ...(estado ? { estado } : {}) }, estado);
  }

  async aprobar(
    id: string,
    session: SessionUser,
    comentario?: string,
  ): Promise<ISolicitudPlantilla> {
    return this.resolver(id, session, 'APROBADA', comentario?.trim() || null);
  }

  /**
   * Rechaza el pedido. El motivo es obligatorio.
   *
   * Un rechazo sin explicación obliga al director a adivinar qué corregir, y el
   * trámite vuelve igual: no ahorra tiempo, lo gasta dos veces.
   */
  async rechazar(
    id: string,
    session: SessionUser,
    comentario?: string,
  ): Promise<ISolicitudPlantilla> {
    const motivo = comentario?.trim();
    if (!motivo) {
      throw new BadRequestException('Indique el motivo del rechazo.');
    }
    return this.resolver(id, session, 'RECHAZADA', motivo);
  }

  /**
   * Ruta del PDF de justificación, si esta sesión puede verlo.
   *
   * El archivo NO puede servirse como estático: `uploads/` no exige sesión, así
   * que cualquiera con la URL se lo llevaría. Es el mismo agujero que ya se
   * cerró para las firmas manuscritas, y este documento —donde una institución
   * explica sus necesidades internas— merece el mismo trato.
   *
   * Ante una solicitud ajena responde «no encontrada» y no «prohibido»: un 403
   * confirmaría que esa solicitud existe. Mismo criterio que las solicitudes de
   * visita.
   */
  async rutaDeJustificacion(
    id: string,
    quien: { userId: string; esGestor: boolean; institucionId?: string | null },
  ): Promise<string> {
    if (!quien.esGestor && !quien.institucionId) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const fila = await this.prisma.solicitudPlantilla.findFirst({
      // El gestor ve la bandeja completa; el resto, sólo lo de su institución.
      where: quien.esGestor ? { id } : { id, institucionId: quien.institucionId! },
      select: { justificacionUrl: true },
    });

    if (!fila) throw new NotFoundException('Solicitud no encontrada.');
    return fila.justificacionUrl;
  }

  /**
   * Personal de la I.E. que puede recibir un vale, para que el director elija.
   *
   * Sale del padrón: quien no está registrado como usuario activo de la
   * institución no aparece, y por lo tanto no puede ser destinatario. Es a
   * propósito —obliga a tener el personal cargado antes de pedir— y evita que
   * el pedido nombre a alguien que el sistema no conoce.
   */
  async destinatarios(session: SessionUser): Promise<IDestinatarioDeVale[]> {
    const elegibles = await this.destinatariosDe(this.institucionDelDirector(session));

    return elegibles.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  /**
   * Cada destinatario existe, es de esta institución y ocupa el cargo declarado.
   *
   * Se comprueba en el servidor y no sólo al armar el formulario: el cuerpo lo
   * controla quien envía, y un `beneficiarioId` de otra institución convertiría
   * el pedido en una autorización para alguien de afuera.
   */
  private async validarDestinatarios(
    items: ICrearSolicitudPlantillaRequest['items'],
    institucionId: string,
  ): Promise<void> {
    const elegibles = new Map(
      (await this.destinatariosDe(institucionId)).map((d) => [d.usuarioId, d]),
    );

    for (const item of items) {
      const destinatario = elegibles.get(item.beneficiarioId);
      if (!destinatario) {
        throw new BadRequestException(
          'Una de las plantillas se destina a alguien que no figura como personal activo de su institución.',
        );
      }
      if (destinatario.cargo !== item.cargoBeneficiario) {
        throw new BadRequestException(
          `${destinatario.nombre} figura como ${destinatario.cargo}, no como ${item.cargoBeneficiario}.`,
        );
      }
    }
  }

  /** La misma consulta que `destinatarios`, ya resuelta la institución. */
  private async destinatariosDe(institucionId: string): Promise<IDestinatarioDeVale[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        isActive: true,
        rol: { codigo: { in: ROLES_DESTINATARIOS } },
        persona: { docente: { institucionId } },
      },
      select: {
        id: true,
        rol: { select: { codigo: true } },
        persona: { select: { nombres: true, apellidos: true } },
      },
    });

    return usuarios.map((u) => ({
      usuarioId: u.id,
      nombre: `${u.persona.nombres} ${u.persona.apellidos}`.trim(),
      cargo: CARGO_POR_ROL[u.rol.codigo]!,
    }));
  }

  /**
   * Aplica la decisión sobre una solicitud que siga pendiente.
   *
   * La condición `estado: 'PENDIENTE'` viaja en el UPDATE y no sólo en una
   * lectura previa: dos decisiones simultáneas sobre la misma solicitud leerían
   * el mismo estado, y sólo una debe poder resolverla.
   */
  private async resolver(
    id: string,
    session: SessionUser,
    estado: EstadoSolicitudPlantilla,
    comentario: string | null,
  ): Promise<ISolicitudPlantilla> {
    const { count } = await this.prisma.solicitudPlantilla.updateMany({
      where: { id, estado: 'PENDIENTE' },
      data: { estado, comentario, resueltaPorId: session.id, resueltaAt: new Date() },
    });

    if (count === 0) {
      throw new ConflictException(
        'La solicitud no existe o ya fue resuelta. Actualice la bandeja.',
      );
    }

    const fila = await this.prisma.solicitudPlantilla.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!fila) throw new NotFoundException('Solicitud no encontrada.');

    // Se emite después del UPDATE condicional: si otra sesión resolvió primero,
    // el `count` fue 0 y acá no se llega. Así no se avisa dos veces la misma
    // decisión.
    this.eventEmitter.emit('solicitud-plantilla.resuelta', {
      solicitudId: id,
      resolutorId: session.id,
      estado,
    });

    return this.aContrato(fila);
  }

  private async buscar(
    where: Record<string, unknown>,
    estado?: string,
  ): Promise<ISolicitudesPlantillaResponse> {
    const [filas, pendientes] = await Promise.all([
      this.prisma.solicitudPlantilla.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitudPlantilla.count({
        where: { ...where, estado: 'PENDIENTE' },
      }),
    ]);

    void estado;
    return {
      solicitudes: (filas as FilaSolicitud[]).map((f) => this.aContrato(f)),
      pendientes,
    };
  }

  /**
   * Institución del director que firma, o 403.
   *
   * Es el único punto donde se decide de qué institución es un pedido: no se
   * lee del cuerpo, que lo controla quien envía.
   */
  private institucionDelDirector(session: SessionUser): string {
    if (session.role !== RoleCode.DIRECTOR_INSTITUCION) {
      throw new ForbiddenException(
        'Sólo el director de la institución educativa presenta solicitudes de plantilla.',
      );
    }
    if (!session.institucionId) {
      throw new ForbiddenException('La sesión no tiene una institución educativa asociada.');
    }
    return session.institucionId;
  }

  private validarItems(items: ICrearSolicitudPlantillaRequest['items']): void {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Indique al menos una plantilla en la solicitud.');
    }

    for (const item of items) {
      if (!INSTRUMENTOS_SOLICITABLES.includes(item.instrumento)) {
        // La ficha directiva la aplica el especialista de la UGEL. Admitirla acá
        // abriría una puerta que el negocio no tiene.
        throw new BadRequestException(
          `Una institución no puede solicitar una plantilla de tipo ${item.instrumento}.`,
        );
      }
      if (!CARGOS_VALIDOS.includes(item.cargoBeneficiario)) {
        throw new BadRequestException(
          `El cargo "${item.cargoBeneficiario}" no corresponde a un cargo de la institución.`,
        );
      }
      if (!item.descripcion?.trim()) {
        throw new BadRequestException('Cada plantilla solicitada necesita una descripción.');
      }
      if (!item.beneficiarioId?.trim()) {
        // Sin destinatario el vale lo consume el primero de ese cargo que entre,
        // que es exactamente lo que este campo vino a cerrar.
        throw new BadRequestException(
          'Indique a qué persona de su institución se destina cada plantilla solicitada.',
        );
      }
    }
  }

  private aContrato(f: FilaSolicitud): ISolicitudPlantilla {
    return {
      id: f.id,
      institucionId: f.institucionId,
      institucionNombre: f.institucion.nombre,
      solicitante: nombreDe(f.solicitante) ?? 'Director de I.E.',
      anioEscolar: f.anioEscolar,
      justificacionUrl: f.justificacionUrl,
      estado: f.estado as EstadoSolicitudPlantilla,
      comentario: f.comentario,
      resueltaPor: nombreDe(f.resueltaPor),
      resueltaAt: f.resueltaAt ? f.resueltaAt.toISOString() : null,
      createdAt: f.createdAt.toISOString(),
      items: f.items.map((i) => ({
        id: i.id,
        instrumento: i.instrumento as TipoPlantilla,
        cargoBeneficiario: i.cargoBeneficiario as CargoBeneficiario,
        descripcion: i.descripcion,
        beneficiarioId: i.beneficiarioId,
        beneficiarioNombre: nombreDe(i.beneficiario),
        plantillaId: i.plantillaId,
      })),
    };
  }
}
