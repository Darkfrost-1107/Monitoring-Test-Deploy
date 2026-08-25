import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';
import type { FichaRepository } from '../repositories/ficha.repository.js';
import type { BaremoCalculatorService } from '../motor/baremo-calculator.service.js';
import type { FinalizarFichaDto } from '../dto/ficha.dto.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import { assertEsMonitorAsignado } from './evaluador-guard.js';

/** Verifica que la sesión sea el monitor asignado a la visita de la ficha. */
async function assertMonitorDeFicha(
  repository: FichaRepository,
  cronogramaId: string,
  session: SessionUser,
): Promise<void> {
  const cronograma = await repository.findCronogramaBasicById(cronogramaId);
  if (!cronograma) throw new NotFoundException(`Visita ${cronogramaId} no encontrada.`);
  assertEsMonitorAsignado(session, cronograma.monitorId);
}

export async function finalizar(
  repository: FichaRepository,
  baremoService: BaremoCalculatorService,
  fichaId: string,
  dto: FinalizarFichaDto,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const ficha = await repository.findById(fichaId);
  if (!ficha) throw new NotFoundException(`Ficha ${fichaId} no encontrada.`);

  // Sólo el monitor asignado a la visita puede finalizar su ficha.
  await assertMonitorDeFicha(repository, ficha.cronogramaId, session);

  if (ficha.estado !== 'BORRADOR') {
    throw new BadRequestException(`La ficha ya esta ${ficha.estado}.`);
  }

  if (ficha.respuestasDesempeno.length === 0) {
    throw new BadRequestException('No se puede finalizar una ficha sin respuestas de desempeno.');
  }

  /**
   * El total sale de los desempeños.
   *
   * En el consolidado de la ficha docente la fila TOTAL abarca D1 a D5, y los
   * ejes e items —R6 y R7— llevan sus propias celdas al costado: se califican
   * con la misma escala pero se informan aparte. Cuántos desempeños declare la
   * plantilla puede variar, y por eso el baremo se resuelve sobre el porcentaje,
   * que se ajusta solo al máximo que esa plantilla permita.
   */
  const niveles = ficha.respuestasDesempeno.map((r) => r.nivel);

  // El nivel de logro lo decide la escala que declara la plantilla, leída en su
  // modo: la rúbrica docente corta sobre el puntaje y la directiva sobre el
  // porcentaje de avance. El EIB es informativo (No/Parcial/Sí): registra la
  // práctica pero no produce puntaje ni nivel, así que se finaliza en nulo.
  const escala = await repository.findEscalaDePlantilla(ficha.plantillaId);
  const esInformativo = escala.tipoMonitoreo === 'DOCENTE_EIB';
  const resultado = esInformativo
    ? { puntajeTotal: null, promedio: null, nivelLogro: null }
    : baremoService.calcularResultadoCompleto(niveles, escala.tramos, escala.modo);

  const result = await repository.finalizar(
    fichaId,
    resultado.puntajeTotal,
    resultado.promedio,
    resultado.nivelLogro,
    session.id,
    dto.observaciones,
    dto.sugerencias,
    dto.compromisos,
    dto.evidenciaGeneral,
  );

  await repository.updateCronogramaEstado(ficha.cronogramaId, 'COMPLETADO');

  return result;
}

export async function migrarPlantilla(
  repository: FichaRepository,
  fichaId: string,
  nuevaPlantillaId: string,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const ficha = await repository.findById(fichaId);
  if (!ficha) throw new NotFoundException(`Ficha ${fichaId} no encontrada.`);

  // Sólo el monitor asignado a la visita puede migrar la plantilla de su ficha.
  await assertMonitorDeFicha(repository, ficha.cronogramaId, session);

  if (ficha.estado !== 'BORRADOR') {
    throw new BadRequestException(
      `Solo se pueden migrar fichas en BORRADOR. Estado actual: ${ficha.estado}.`,
    );
  }

  const plantillaNueva = await repository.findPlantillaBasicById(nuevaPlantillaId);
  if (!plantillaNueva) {
    throw new NotFoundException(`Plantilla ${nuevaPlantillaId} no encontrada.`);
  }

  return repository.migrarPlantilla(
    fichaId,
    nuevaPlantillaId,
    ficha.respuestasDesempeno.map((r) => ({ id: r.desempenoId, nivel: r.nivel })),
    ficha.respuestasAspecto.map((r) => ({ id: r.aspectoId, marcado: r.marcado })),
  );
}
