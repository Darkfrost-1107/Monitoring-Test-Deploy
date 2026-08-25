import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CargoBeneficiario,
  type IValeDisponible,
  type TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

/**
 * El vale que autoriza a una institución a crear una plantilla propia.
 *
 * El catálogo oficial son las tres fichas de la UGEL. Una institución que
 * necesita un instrumento propio lo pide antes con un PDF, y el Jefe de Gestión
 * aprueba o rechaza. Cada ítem aprobado habilita UNA plantilla.
 *
 * ── Por qué la autorización se ata a un instrumento y no es un permiso suelto ──
 * El Jefe de Gestión aprueba un documento que describe una intención: la
 * plantilla todavía no existe cuando decide. Si la aprobación fuera un permiso
 * genérico, la institución construiría después cualquier cosa y nadie
 * compararía lo aprobado con lo construido. El vale lleva instrumento, cargo
 * destinatario y año, y el servidor verifica que coincidan.
 *
 * ── Por qué el consumo es único ──
 * Un vale reutilizable convertiría una aprobación de tres plantillas en un
 * permiso ilimitado, y eso no se ve: no hay error, sólo un catálogo que crece.
 */

/** Roles cuya sesión pertenece a una institución educativa. */
const ROLES_DE_INSTITUCION: readonly RoleCode[] = [
  RoleCode.DIRECTOR_INSTITUCION,
  RoleCode.COORDINADOR_PEDAGOGICO,
  RoleCode.JEFE_TALLER,
];

/** Fila del vale con la cabecera de su solicitud. */
interface ValeConSolicitud {
  id: string;
  instrumento: string;
  cargoBeneficiario: string;
  descripcion: string;
  solicitud: { anioEscolar: number };
}

@Injectable()
export class ValePlantillaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca un vale libre para la plantilla que se está por crear.
   *
   * Devuelve `null` cuando la sesión no necesita vale —la UGEL crea las fichas
   * oficiales, que son suyas— y lanza 403 cuando una institución intenta crear
   * sin autorización previa.
   *
   * No marca el vale acá: sólo lo elige. El consumo se confirma con
   * `marcarConsumido` una vez que la plantilla existe, para no gastar una
   * autorización si la creación falla después.
   */
  async consumirParaCrear(
    session: SessionUser,
    instrumento: TipoPlantilla,
    anioEscolar: number = new Date().getFullYear(),
  ): Promise<{ id: string } | null> {
    const institucionId = this.institucionDe(session);
    if (institucionId === null) return null;

    const libre = await this.prisma.solicitudPlantillaItem.findFirst({
      where: {
        instrumento,
        // Un vale sin plantilla asociada es un vale sin usar. Es la única
        // diferencia entre uno libre y uno gastado.
        plantillaId: null,
        solicitud: { estado: 'APROBADA', institucionId, anioEscolar },
      },
      select: { id: true },
    });

    if (!libre) {
      throw new ForbiddenException(
        `Su institución no tiene una solicitud aprobada con un cupo libre para una plantilla ` +
          `de tipo ${instrumento} en ${anioEscolar}. El director de la I.E. debe presentar la ` +
          `solicitud con su justificación en PDF para que la Jefatura de Gestión la apruebe.`,
      );
    }

    return libre;
  }

  /**
   * Ata el vale a la plantilla recién creada.
   *
   * La condición `plantillaId: null` viaja en el UPDATE y no sólo en la lectura
   * previa: es lo que cierra la carrera entre dos creaciones simultáneas, donde
   * ambas leerían el mismo vale libre y sólo una debe poder gastarlo. Si el
   * UPDATE no toca ninguna fila, alguien llegó primero.
   */
  async marcarConsumido(itemId: string, plantillaId: string): Promise<void> {
    const { count } = await this.prisma.solicitudPlantillaItem.updateMany({
      where: { id: itemId, plantillaId: null },
      data: { plantillaId },
    });

    if (count === 0) {
      throw new ForbiddenException(
        'El cupo de la solicitud ya fue utilizado por otra plantilla. Vuelva a intentarlo.',
      );
    }
  }

  /** Vales libres de la institución, para que la pantalla de creación los ofrezca. */
  async disponibles(session: SessionUser, anioEscolar: number): Promise<IValeDisponible[]> {
    const institucionId = this.institucionDe(session);
    if (institucionId === null) return [];

    const libres = await this.prisma.solicitudPlantillaItem.findMany({
      where: {
        plantillaId: null,
        solicitud: { estado: 'APROBADA', institucionId, anioEscolar },
      },
      select: {
        id: true,
        instrumento: true,
        cargoBeneficiario: true,
        descripcion: true,
        solicitud: { select: { anioEscolar: true } },
      },
    });

    return (libres as ValeConSolicitud[]).map((v) => ({
      itemId: v.id,
      instrumento: v.instrumento as TipoPlantilla,
      cargoBeneficiario: v.cargoBeneficiario as CargoBeneficiario,
      descripcion: v.descripcion,
      anioEscolar: v.solicitud.anioEscolar,
    }));
  }

  /**
   * Institución a la que pertenece la sesión, o `null` si es de la UGEL.
   *
   * `null` significa «no le corresponde vale», no «no se pudo determinar». El
   * personal de UGEL crea las fichas oficiales del catálogo.
   */
  private institucionDe(session: SessionUser): string | null {
    if (!ROLES_DE_INSTITUCION.includes(session.role)) return null;
    return session.institucionId ?? null;
  }
}
