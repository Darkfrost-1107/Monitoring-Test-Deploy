import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { finalizar } from './ficha-finalizar.helper.js';
import { BaremoCalculatorService } from '../motor/baremo-calculator.service.js';
import type { FichaRepository } from '../repositories/ficha.repository.js';
import type { FinalizarFichaDto } from '../dto/ficha.dto.js';
import type { TramoDeEscala } from '@sistema-monitoreo/shared-contracts';

/**
 * Pruebas de la finalización de ficha: el punto donde el nivel de logro se
 * calcula y se guarda.
 *
 * No tenía cobertura. Sólo se probaba el método del repositorio que escribe la
 * fila —recibiendo el nivel ya resuelto— de modo que la decisión misma, que es
 * lo que el evaluado ve en su ficha, no la verificaba nadie.
 *
 * Lo que se fija acá es que el nivel sale de la escala que declara la plantilla
 * y no de umbrales fijos: la rúbrica docente de la UGEL Lampa corta en
 * 5·8·13·18 sobre un máximo de 20 y la directiva en 0·9·17·21 sobre 24.
 */

const ESCALA_DOCENTE: TramoDeEscala[] = [
  { nivelRomano: 'I', rangoMin: 5, denominacion: 'Inicio' },
  { nivelRomano: 'II', rangoMin: 8, denominacion: 'En proceso' },
  { nivelRomano: 'III', rangoMin: 13, denominacion: 'Logro esperado' },
  { nivelRomano: 'IV', rangoMin: 18, denominacion: 'Logro destacado' },
];

const ESCALA_DIRECTIVO: TramoDeEscala[] = [
  { nivelRomano: 'I', rangoMin: 25, denominacion: 'En inicio' },
  { nivelRomano: 'II', rangoMin: 50, denominacion: 'En proceso' },
  { nivelRomano: 'III', rangoMin: 75, denominacion: 'Logrado' },
  { nivelRomano: 'IV', rangoMin: 100, denominacion: 'Satisfactorio' },
];

const DTO: FinalizarFichaDto = {};
const SESION = { id: 'user-1', role: 'especialista', especialistaId: 'esp-1' } as never;

const fichaCon = (
  niveles: number[],
  over: Record<string, unknown> = {},
  nivelesDeEjes: number[] = [],
) => ({
  id: 'f-1',
  estado: 'BORRADOR',
  plantillaId: 'pl-1',
  cronogramaId: 'cr-1',
  respuestasDesempeno: niveles.map((nivel, i) => ({ id: `r-${i}`, nivel })),
  respuestasEjeItem: nivelesDeEjes.map((nivel, i) => ({ id: `e-${i}`, nivel })),
  ...over,
});

const armarRepositorio = (
  ficha: unknown,
  tramos: TramoDeEscala[],
  modo: 'Vigente' | 'Porcentual' = 'Vigente',
) => {
  const repo = {
    findById: jest.fn<any>().mockResolvedValue(ficha),
    findCronogramaBasicById: jest.fn<any>().mockResolvedValue({ id: 'cr-1', monitorId: 'esp-1' }),
    findEscalaDePlantilla: jest.fn<any>().mockResolvedValue({ modo, tramos }),
    finalizar: jest.fn<any>().mockImplementation((...args: unknown[]) => ({ id: 'f-1', args })),
    updateCronogramaEstado: jest.fn<any>().mockResolvedValue(undefined),
  };
  return repo as unknown as jest.Mocked<FichaRepository> & typeof repo;
};

/** El nivel de logro es el tercer argumento con que se escribe la ficha. */
const nivelGuardado = (repo: { finalizar: jest.Mock }) => repo.finalizar.mock.calls[0][3];

describe('finalizar — el nivel sale de la escala de la plantilla', () => {
  const baremo = new BaremoCalculatorService();

  it('lee la escala de la plantilla de la ficha', async () => {
    const repo = armarRepositorio(fichaCon([3, 3, 3, 3, 3]), ESCALA_DOCENTE, 'Vigente');

    await finalizar(repo, baremo, 'f-1', DTO, SESION);

    expect(repo.findEscalaDePlantilla).toHaveBeenCalledWith('pl-1');
  });

  it('guarda LOGRO_DESTACADO para un total de 18 en la rúbrica docente', async () => {
    const repo = armarRepositorio(fichaCon([4, 4, 4, 3, 3]), ESCALA_DOCENTE, 'Vigente');

    await finalizar(repo, baremo, 'f-1', DTO, SESION);

    expect(nivelGuardado(repo)).toBe('LOGRO_DESTACADO');
  });

  /**
   * El mismo puntaje, otra rúbrica, otro nivel. Con el baremo fijo anterior las
   * dos fichas quedaban en LOGRO_DESTACADO y la directiva se guardaba mal.
   */
  it('guarda LOGRO_ESPERADO para ese mismo total de 18 en la rúbrica directiva', async () => {
    // 18 de 20: 90% de avance, que cae en «Logrado» (75%).
    const repo = armarRepositorio(fichaCon([4, 4, 4, 3, 3]), ESCALA_DIRECTIVO, 'Porcentual');

    await finalizar(repo, baremo, 'f-1', DTO, SESION);

    expect(nivelGuardado(repo)).toBe('LOGRO_ESPERADO');
  });

  /**
   * La rúbrica directiva admite el tramo más bajo desde cero. El baremo
   * anterior lanzaba excepción por debajo de promedio 1 y hacía fallar la
   * finalización entera.
   */
  it('finaliza una ficha directiva en el tramo más bajo sin fallar', async () => {
    const repo = armarRepositorio(fichaCon([1, 1, 1, 1, 1]), ESCALA_DIRECTIVO, 'Porcentual');

    await expect(finalizar(repo, baremo, 'f-1', DTO, SESION)).resolves.toBeDefined();
    expect(nivelGuardado(repo)).toBe('INICIO');
  });

  /**
   * Una ficha directiva perfecta alcanza el nivel más alto. Leída sobre el
   * puntaje crudo con los rangos absolutos del documento —cuyo tramo superior
   * arranca en 21— se quedaba en «Logrado».
   */
  it('guarda LOGRO_DESTACADO con las cinco rúbricas en nivel IV', async () => {
    const repo = armarRepositorio(fichaCon([4, 4, 4, 4, 4]), ESCALA_DIRECTIVO, 'Porcentual');

    await finalizar(repo, baremo, 'f-1', DTO, SESION);

    expect(nivelGuardado(repo)).toBe('LOGRO_DESTACADO');
  });

  it('marca la visita como completada', async () => {
    const repo = armarRepositorio(fichaCon([3, 3, 3]), ESCALA_DOCENTE, 'Vigente');

    await finalizar(repo, baremo, 'f-1', DTO, SESION);

    expect(repo.updateCronogramaEstado).toHaveBeenCalledWith('cr-1', 'COMPLETADO');
  });
});

describe('finalizar — lo que rechaza', () => {
  const baremo = new BaremoCalculatorService();

  it('no finaliza una ficha inexistente', async () => {
    const repo = armarRepositorio(null, ESCALA_DOCENTE);
    await expect(finalizar(repo, baremo, 'f-1', DTO, SESION)).rejects.toThrow(NotFoundException);
  });

  it('no finaliza una ficha que ya no está en borrador', async () => {
    const repo = armarRepositorio(fichaCon([3], { estado: 'FINALIZADO' }), ESCALA_DOCENTE);
    await expect(finalizar(repo, baremo, 'f-1', DTO, SESION)).rejects.toThrow(BadRequestException);
  });

  it('no finaliza una ficha sin respuestas de desempeño', async () => {
    const repo = armarRepositorio(fichaCon([]), ESCALA_DOCENTE);
    await expect(finalizar(repo, baremo, 'f-1', DTO, SESION)).rejects.toThrow(BadRequestException);
  });
});
