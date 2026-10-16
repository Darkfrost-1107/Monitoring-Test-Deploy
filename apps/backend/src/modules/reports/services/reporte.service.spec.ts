import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { IReporteFicha } from '@sistema-monitoreo/shared-contracts';
import { ReporteService } from './reporte.service.js';
import { fichaOficialRaw } from './ficha-oficial-docente.fixture.js';
import type { FichaOficialPersistida } from './ficha-oficial-docente.imagenes.js';

/**
 * Qué formato sale al pedir el PDF de una ficha: la docente se imprime en el
 * formulario oficial de la UGEL; las demás conservan por ahora su plantilla.
 */

const { firmas: _f, evidencias: _e, ...sinImagenes } = fichaOficialRaw();
const persistida: FichaOficialPersistida = { ...sinImagenes, firmas: [], evidenciaGeneral: null };

const fichaLegada = (instrumento: string) =>
  ({
    id: 'f1',
    instrumento,
    anioAcademico: 2026,
    nivelLogro: 'LOGRO_ESPERADO',
    puntajeTotal: 13,
    promedio: 2.6,
    estado: 'FINALIZADO',
    institucionNombre: 'IE',
    institucionCodigoModular: '1',
    evaluadoNombre: 'Docente',
    especialistaNombre: 'Monitor',
    fechaEjecucion: '2026-10-16T12:00:00Z',
    respuestas: [],
    firmas: [],
  }) as unknown as IReporteFicha;

function armar(ficha: IReporteFicha | null, oficial: FichaOficialPersistida | null = persistida) {
  const repository = {
    findFichaByIdParaExport: jest.fn(() => Promise.resolve(ficha)),
    findFichaOficialDocente: jest.fn(() => Promise.resolve(oficial)),
  };
  const generador = {
    generatePdfFromTemplate: jest.fn((..._args: unknown[]) => Promise.resolve(Buffer.from('%PDF'))),
  };
  const servicio = new ReporteService(
    repository as never,
    generador as never,
    {} as never,
    {} as never,
  );
  return { servicio, repository, generador };
}

const sesion = { id: 'u1', roles: [] } as never;

describe('ReporteService.exportarFichaPDF', () => {
  it('una ficha docente se imprime en el formulario oficial', async () => {
    const { servicio, generador } = armar(fichaLegada('DOCENTE'));

    await servicio.exportarFichaPDF('f1', sesion);

    const [plantilla, datos] = generador.generatePdfFromTemplate.mock.calls[0] as [
      string,
      { anio: number },
    ];
    expect(plantilla).toBe('ficha-docente-oficial');
    expect(datos.anio).toBe(2026);
  });

  it('devuelve el PDF que genera Gotenberg', async () => {
    const { servicio } = armar(fichaLegada('DOCENTE'));

    expect((await servicio.exportarFichaPDF('f1', sesion)).toString()).toBe('%PDF');
  });

  it.each(['DIRECTIVO', 'DOCENTE_EIB'])(
    'una ficha %s conserva su plantilla',
    async (instrumento) => {
      const { servicio, generador, repository } = armar(fichaLegada(instrumento));

      await servicio.exportarFichaPDF('f1', sesion);

      expect(generador.generatePdfFromTemplate.mock.calls[0][0]).toBe('ficha-report');
      expect(repository.findFichaOficialDocente).not.toHaveBeenCalled();
    },
  );

  it('una ficha inexistente o sin acceso da 404 y no genera nada', async () => {
    const { servicio, generador } = armar(null);

    await expect(servicio.exportarFichaPDF('f1', sesion)).rejects.toBeInstanceOf(NotFoundException);
    expect(generador.generatePdfFromTemplate).not.toHaveBeenCalled();
  });

  it('si la ficha docente desaparece entre las dos lecturas, da 404', async () => {
    const { servicio } = armar(fichaLegada('DOCENTE'), null);

    await expect(servicio.exportarFichaPDF('f1', sesion)).rejects.toBeInstanceOf(NotFoundException);
  });
});
