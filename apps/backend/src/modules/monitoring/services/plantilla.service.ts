import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPlantilla, IUpdatePlantillaResponse } from '@sistema-monitoreo/shared-contracts';
import { PlantillaRepository } from '../repositories/plantilla.repository.js';
import type { CreatePlantillaDto } from '../dto/create-plantilla.dto.js';
import type { UpdatePlantillaDto, PatchEstadoPlantillaDto } from '../dto/update-plantilla.dto.js';
import type { QueryPlantillaDto } from '../dto/query-plantilla.dto.js';
import { PrerrequisitosDirectorService } from './prerrequisitos-director.service.js';
import { ValePlantillaService } from '../../solicitudes-plantilla/services/vale-plantilla.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import {
  validarReglas,
  resolveAutor,
  esAutorDeInstitucion,
  guardVisibilidad,
  guardModificacion,
  validarAnioAcademico,
} from './plantilla-service.validator.js';

@Injectable()
export class PlantillaService {
  constructor(
    private readonly repository: PlantillaRepository,
    private readonly prerrequisitos: PrerrequisitosDirectorService,
    private readonly vales: ValePlantillaService,
  ) {}

  private isSchoolStaff(session: SessionUser): boolean {
    return (
      session.role === RoleCode.DIRECTOR_INSTITUCION ||
      session.role === RoleCode.COORDINADOR_PEDAGOGICO ||
      session.role === RoleCode.JEFE_TALLER
    );
  }

  async findAll(filters?: QueryPlantillaDto, session?: SessionUser): Promise<IPlantilla[]> {
    const scopedFilters = { ...filters };
    if (session) {
      if (this.isSchoolStaff(session) && session.institucionId) {
        scopedFilters.institucionId = session.institucionId;
        // Ven las docentes —regular y EIB— para poder clonarlas; el directivo es
        // de la UGEL y se excluye más abajo. Antes se forzaba sólo 'DOCENTE', de
        // modo que la EIB ni aparecía y no se podía copiar a la I.E.
      } else if (session.role === RoleCode.JEFE_AREA) {
        scopedFilters.rolAutorAlCrear = 'jefe_gestion'; // Solo plantillas UGEL
      }
      // JEFE_GESTION no tiene filtro restrictivo aquí, puede ver UGEL e IE
    }

    let plantillas = await this.repository.findAll(scopedFilters);

    if (session) {
      const isUgelRole =
        session.role === RoleCode.JEFE_GESTION ||
        session.role === RoleCode.JEFE_AREA ||
        session.role === RoleCode.DIRECTOR_UGEL ||
        session.role === RoleCode.ESPECIALISTA;

      if (isUgelRole) {
        // UGEL no debe ver plantillas 'Borrador' de las II.EE.
        plantillas = plantillas.filter(
          (p) => !(esAutorDeInstitucion(p.rolAutorAlCrear) && p.estado === 'Borrador'),
        );
      } else if (this.isSchoolStaff(session)) {
        // El personal de IE monitorea docentes (regular y EIB), no directivos:
        // el instrumento directivo es competencia de la UGEL.
        plantillas = plantillas.filter((p) => p.tipoMonitoreo !== 'DIRECTIVO');

        // IE no debe ver plantillas 'Borrador' de la UGEL
        plantillas = plantillas.filter(
          (p) => !(p.rolAutorAlCrear === 'jefe_gestion' && p.estado === 'Borrador'),
        );

        // Coordinador y Jefe de Taller ven el catálogo de la UGEL y lo de su
        // propia institución, nada más.
        //
        // Antes se les ocultaban las de la UGEL: sólo veían las de su I.E.
        // Bajo el modelo actual eso los deja sin instrumento. El catálogo de la
        // UGEL es OBLIGATORIO y una plantilla propia sólo cuenta si nació de una
        // solicitud aprobada, de modo que un coordinador con un clon sin
        // autorizar se quedaba con la lista vacía y el calendario le decía «no
        // hay una plantilla vigente» con las tres fichas oficiales publicadas.
        //
        // Se filtra por DUEÑO (`institucionId`), que es el hecho, y no por el
        // sello del autor: el sello es histórico y puede faltar en plantillas
        // anteriores a que existiera.
        if (
          session.role === RoleCode.COORDINADOR_PEDAGOGICO ||
          session.role === RoleCode.JEFE_TALLER
        ) {
          plantillas = plantillas.filter(
            (p) => p.institucionId === null || p.institucionId === session.institucionId,
          );
        }
      }
    }

    // Filtro global: No mostrar borradores de años anteriores (Regla de negocio)
    const currentYear = new Date().getFullYear();
    plantillas = plantillas.filter(
      (p) => !(p.estado === 'Borrador' && p.anioAcademico !== currentYear),
    );

    return plantillas;
  }

  async findById(id: string, session?: SessionUser): Promise<IPlantilla> {
    const p = await this.repository.findById(id);
    if (!p) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
    guardVisibilidad(p, session);
    return p;
  }

  async create(dto: CreatePlantillaDto, session: SessionUser): Promise<IPlantilla> {
    // El coordinador y el jefe de taller no crean su plantilla hasta que el
    // director de la I.E. sentó las bases (plan anual + plantilla vigente).
    await this.prerrequisitos.asegurar(session);
    validarReglas(dto);

    // El catálogo oficial son las tres fichas de la UGEL. Una institución sólo
    // crea un instrumento propio con una solicitud aprobada que lo declare, y
    // cada cupo de esa solicitud alcanza para una sola plantilla.
    const vale = await this.vales.consumirParaCrear(session, dto.tipoMonitoreo, dto.anioAcademico);

    const { rolAutorAlCrear, institucionId } = resolveAutor(session);
    const creada = await this.repository.create({
      data: dto,
      autorId: session.id,
      rolAutorAlCrear,
      institucionId,
    });

    // El cupo se marca DESPUÉS de crear: si la creación fallara, una
    // autorización se habría gastado sin que exista la plantilla que la usó.
    if (vale) await this.vales.marcarConsumido(vale.id, creada.id);

    return creada;
  }

  async update(
    id: string,
    dto: UpdatePlantillaDto,
    session: SessionUser,
  ): Promise<IUpdatePlantillaResponse> {
    const original = await this.repository.findById(id);
    if (!original) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
    guardModificacion(original, session);

    const fichasAsociadas = await this.repository.countFichasAsociadas(id);
    if (fichasAsociadas > 0) {
      const clon = await this.repository.versionarConClon(id, { data: dto }, session.id);
      return {
        id: clon.id,
        version: clon.version,
        modo: 'VERSIONADO',
        mensaje: `La plantilla tenia ${fichasAsociadas} ficha(s) asociada(s). Se creo la version v${clon.version}; la anterior quedo como Historico.`,
        plantilla: clon,
      };
    }

    const actualizada = await this.repository.updateInPlace(id, { data: dto });
    return {
      id: actualizada.id,
      version: actualizada.version,
      modo: 'IN_PLACE',
      mensaje: 'Cambios guardados in-place (sin fichas asociadas).',
      plantilla: actualizada,
    };
  }

  async cambiarEstado(
    id: string,
    dto: PatchEstadoPlantillaDto,
    session: SessionUser,
  ): Promise<IPlantilla> {
    const original = await this.repository.findById(id);
    if (!original) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
    guardModificacion(original, session);

    if (original.estado === 'Historico') {
      throw new BadRequestException(
        'Una plantilla Historico es terminal y no puede cambiar de estado.',
      );
    }
    if (original.estado === dto.estado) {
      return original;
    }

    if (dto.estado === 'Vigente') {
      const otrasVigentes = await this.repository.findAll({
        tipoMonitoreo: original.tipoMonitoreo,
        anioAcademico: original.anioAcademico,
        estado: 'Vigente',
        rolAutorAlCrear: original.rolAutorAlCrear,
        institucionId: original.institucionId,
      });
      // Activar una plantilla releva a la que reg\u00eda: se la archiva sola. Antes
      // esto era un 409 que exig\u00eda archivarla a mano, o sea dos pasos para una
      // sola intenci\u00f3n \u2014\u00abesta es la que rige ahora\u00bb\u2014 y un error que ni siquiera
      // dec\u00eda cu\u00e1l era el paso que faltaba. La regla de una sola vigente por
      // (tipo, a\u00f1o, autor, instituci\u00f3n) se mantiene: lo que cambia es que el
      // sistema la hace cumplir en vez de exigirle al usuario que la cumpla.
      const aArchivar = otrasVigentes.filter((p) => p.id !== id).map((p) => p.id);
      if (aArchivar.length > 0) {
        return this.repository.activarArchivando(id, aArchivar);
      }
    }
    return this.repository.updateEstado(id, dto.estado);
  }

  async eliminar(
    id: string,
    session: SessionUser,
  ): Promise<{ id: string; deletedFichas: number; deletedEvidencias: number }> {
    const original = await this.repository.findById(id);
    if (!original) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
    guardModificacion(original, session);

    const isSchoolStaffUser =
      session.role === RoleCode.DIRECTOR_INSTITUCION ||
      session.role === RoleCode.COORDINADOR_PEDAGOGICO ||
      session.role === RoleCode.JEFE_TALLER;

    if (session.role !== RoleCode.JEFE_GESTION && !isSchoolStaffUser) {
      throw new ForbiddenException(
        'Solo el Jefe de Gestion, Director IE, Coordinador o Jefe de Taller pueden eliminar plantillas.',
      );
    }

    const fichas = await this.repository.findFichasByPlantilla(id);
    const fichasCount = fichas.length;

    if (original.estado !== 'Historico' && fichasCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la plantilla en estado ${original.estado} porque tiene ${fichasCount} ficha(s) asociada(s). Archivela primero (cambie a Historico) o versione desde el editor.`,
      );
    }

    const evidenciaUrls: string[] = fichas.flatMap((f) => f.evidenciaUrls);
    const result = await this.repository.eliminarConCascade(id);

    let deletedEvidencias = 0;
    if (evidenciaUrls.length > 0) {
      deletedEvidencias = await deleteEvidenciaFiles(evidenciaUrls);
    }

    return { id: result.id, deletedFichas: result.deletedFichas, deletedEvidencias };
  }

  async countFichas(
    id: string,
    session: SessionUser,
  ): Promise<{ count: number; estado: 'Borrador' | 'Vigente' | 'Historico' }> {
    const original = await this.repository.findById(id);
    if (!original) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
    guardVisibilidad(original, session);
    const count = await this.repository.countFichasAsociadas(id);
    return { count, estado: original.estado };
  }

  async duplicar(
    id: string,
    session: SessionUser,
    descripcion?: string,
    anioAcademico?: number,
  ): Promise<IPlantilla> {
    const original = await this.repository.findById(id);
    if (!original) throw new NotFoundException(`Plantilla ${id} no encontrada.`);

    const targetAnio = anioAcademico ?? new Date().getFullYear();
    validarAnioAcademico(targetAnio);

    const { rolAutorAlCrear, institucionId } = resolveAutor(session);

    if (!institucionId && this.isSchoolStaff(session)) {
      throw new ForbiddenException('Usuario de IE sin institucionId en sesion.');
    }

    const isSchoolStaffUserDupl =
      session.role === RoleCode.DIRECTOR_INSTITUCION ||
      session.role === RoleCode.COORDINADOR_PEDAGOGICO ||
      session.role === RoleCode.JEFE_TALLER;

    if (session.role !== RoleCode.JEFE_GESTION && !isSchoolStaffUserDupl) {
      throw new ForbiddenException(
        'Solo Jefe de Gestion, Directores IE, Coordinadores o Jefes de Taller pueden duplicar plantillas.',
      );
    }

    // Duplicar es la otra puerta para tener una plantilla propia, y por eso
    // exige el mismo cupo que crear desde cero. Guardar sólo `create` dejaría
    // la regla abierta por el camino que, de hecho, es el más usado.
    const vale = await this.vales.consumirParaCrear(session, original.tipoMonitoreo, targetAnio);

    const clon = await this.repository.clone(
      id,
      session.id,
      rolAutorAlCrear,
      institucionId,
      descripcion,
      targetAnio,
    );

    if (vale) await this.vales.marcarConsumido(vale.id, clon.id);

    return clon;
  }
}

export async function deleteEvidenciaFiles(urls: string[]): Promise<number> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  let deleted = 0;
  for (const url of urls) {
    try {
      const filename = path.basename(new URL(url, 'http://x').pathname);
      const filepath = path.join(process.cwd(), 'uploads', filename);
      await fs.unlink(filepath);
      deleted += 1;
    } catch {
      // ignore
    }
  }
  return deleted;
}
