import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { IFichaMonitoreo, TipoPlantilla } from '@sistema-monitoreo/shared-contracts';
import { tipoDeVisitaDe } from '@sistema-monitoreo/shared-contracts';
import type { FichaRepository } from '../repositories/ficha.repository.js';
import type { CreateFichaDto } from '../dto/ficha.dto.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import { assertEsMonitorAsignado } from './evaluador-guard.js';
import { assertPuedeAplicarPlantilla } from './plantilla-aplicable.guard.js';

export async function crear(
  repository: FichaRepository,
  dto: CreateFichaDto,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const cronograma = await repository.findCronogramaBasicById(dto.cronogramaId);
  if (!cronograma) throw new NotFoundException(`Visita ${dto.cronogramaId} no encontrada.`);

  // Sólo el monitor asignado a esta visita puede abrir su ficha.
  assertEsMonitorAsignado(session, cronograma.monitorId);

  const anio = cronograma.fechaProgramada.getFullYear();

  // Si el frontend indica la plantilla que el actor está usando (su propia
  // plantilla), se honra tras validarla (Vigente y del mismo tipo/año) para que
  // las respuestas coincidan con la plantilla al renderizar/reportar. Si no se
  // indica o no es válida, se cae al comportamiento anterior (plantilla vigente).
  let plantilla = await (async () => {
    if (!dto.plantillaId) return null;
    const elegida = await repository.findPlantillaBasicById(dto.plantillaId);
    if (!elegida) return null;

    /**
     * Elegir una ficha que no es tuya no cae al respaldo: se rechaza.
     *
     * Lo demás de este bloque descarta en silencio y sigue con la vigente de la
     * UGEL, que está bien para un dato viejo o inconsistente. Acá no: quien
     * pulsó eligió un instrumento a propósito, y cambiárselo por otro sin avisar
     * produce una ficha completa, firmada y evaluada con preguntas que nadie
     * quiso aplicar.
     */
    assertPuedeAplicarPlantilla(elegida, session);

    if (elegida.estado.toLowerCase() !== 'vigente') {
      return null;
    }

    /**
     * La plantilla elegida tiene que servir para esta visita.
     *
     * Una visita DOCENTE admite la ficha regular y la EIB —son sus dos
     * instrumentos— y una DIRECTIVA sólo la directiva. Antes esto eran cuatro
     * banderas con `includes`, y las comparaciones contra 'DOCENTE_EIB' del lado
     * de la VISITA no podían cumplirse nunca: un cronograma es DOCENTE o
     * DIRECTIVO.
     */
    const instrumentoDeLaVisita = tipoDeVisitaDe(elegida.tipoMonitoreo as TipoPlantilla);

    return instrumentoDeLaVisita === cronograma.tipoMonitoreo ? elegida : null;
  })();
  if (!plantilla) {
    plantilla = await repository.findPlantillaVigente(cronograma.tipoMonitoreo, anio);
  }
  if (!plantilla) {
    throw new BadRequestException(
      `No existe plantilla Vigente para (${cronograma.tipoMonitoreo}, ${anio}).`,
    );
  }

  // Comprobar si ya existe una ficha con ESTA plantilla para esta visita
  const existente = await repository.findByVisitaYPlantilla(dto.cronogramaId, plantilla.id);
  if (existente) {
    throw new ConflictException(
      `Ya existe una ficha con esta plantilla para esta visita (id=${existente.id}).`,
    );
  }

  const esDocente = cronograma.tipoMonitoreo === 'DOCENTE';

  if (esDocente) {
    const missing: string[] = [];
    if (!dto.areaCurricular) missing.push('areaCurricular');
    if (!dto.grado) missing.push('grado');
    if (!dto.seccion) missing.push('seccion');
    if (dto.cantidadEstudiantes === undefined) missing.push('cantidadEstudiantes');
    if (dto.cantidadEstudiantesNee === undefined) missing.push('cantidadEstudiantesNee');

    let validCursoId = dto.cursoId;
    if (validCursoId) {
      const exists = await repository.findCursoBasicById(validCursoId);
      if (!exists) {
        validCursoId = undefined;
      }
    }

    if (!validCursoId) {
      const docenteCurso = await repository.findDocenteCursoByDocenteId(cronograma.evaluadoId);
      if (docenteCurso) {
        validCursoId = docenteCurso.cursoId;
      } else {
        const fallbackCurso = await repository.findFirstCursoBasic();
        if (fallbackCurso) {
          validCursoId = fallbackCurso.id;
        }
      }
    }

    if (!validCursoId) missing.push('cursoId');
    else dto.cursoId = validCursoId;

    if (missing.length > 0) {
      throw new BadRequestException(
        `Contexto obligatorio para monitoreo DOCENTE. Faltan: ${missing.join(', ')}.`,
      );
    }
  } else if (cronograma.tipoMonitoreo === 'DIRECTIVO') {
    if (
      dto.areaCurricular ||
      dto.grado ||
      dto.seccion ||
      dto.cantidadEstudiantes !== undefined ||
      dto.cantidadEstudiantesNee !== undefined ||
      dto.cursoId
    ) {
      throw new BadRequestException(
        'Contexto debe ser NULL para monitoreo DIRECTIVO (no aplica area, grado, seccion, ni cantidad).',
      );
    }
  }

  const result = await repository.create({
    cronogramaId: dto.cronogramaId,
    plantillaId: plantilla.id,
    anioAcademico: cronograma.fechaProgramada.getFullYear(),
    contexto: {
      areaCurricular: dto.areaCurricular ?? null,
      grado: dto.grado ?? null,
      seccion: dto.seccion ?? null,
      cantidadEstudiantes: dto.cantidadEstudiantes ?? null,
      cantidadEstudiantesNee: dto.cantidadEstudiantesNee ?? null,
      cursoId: dto.cursoId ?? null,
    },
    creadoPorId: session.id,
  });

  await repository.updateCronogramaEstado(dto.cronogramaId, 'EN_PROCESO');

  return result;
}
