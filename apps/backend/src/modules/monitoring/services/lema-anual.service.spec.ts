import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { LemaAnualService } from './lema-anual.service.js';
import { LemaAnualRepository } from '../repositories/lema-anual.repository.js';
import type { ILemaAnual } from '@sistema-monitoreo/shared-contracts';

/**
 * Pruebas del lema oficial por año académico.
 *
 * El lema lo fija un decreto supremo cada enero. Antes vivía como una tabla
 * literal en el frontend, lo que obligaba a editar código y desplegar para
 * estrenar el año.
 */
describe('LemaAnualService', () => {
  let service: LemaAnualService;
  let repo: jest.Mocked<LemaAnualRepository>;

  const lema2025: ILemaAnual = {
    anio: 2025,
    lema: 'Año de la recuperación y consolidación de la economía peruana',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<LemaAnualRepository>> = {
      findByAnio: jest.fn<any>(),
      upsert: jest.fn<any>(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [LemaAnualService, { provide: LemaAnualRepository, useValue: mockRepo }],
    }).compile();

    service = moduleRef.get(LemaAnualService);
    repo = moduleRef.get(LemaAnualRepository);
  });

  describe('findByAnio', () => {
    it('devuelve el lema del año cuando está cargado', async () => {
      repo.findByAnio.mockResolvedValue(lema2025);
      await expect(service.findByAnio(2025)).resolves.toEqual(lema2025);
    });

    /**
     * Nulo, no un respaldo: un encabezado oficial equivocado afirma la vigencia
     * de un decreto que no rige, y eso es peor que imprimir la ficha sin la
     * línea.
     */
    it('devuelve nulo cuando el año no tiene lema, sin inventar uno', async () => {
      repo.findByAnio.mockResolvedValue(null);
      await expect(service.findByAnio(2027)).resolves.toBeNull();
    });
  });

  describe('upsert', () => {
    it('guarda el lema recortando los espacios de los extremos', async () => {
      repo.upsert.mockResolvedValue(lema2025);

      await service.upsert(2025, `  ${lema2025.lema}  `, 'user-jefe');

      expect(repo.upsert).toHaveBeenCalledWith(2025, lema2025.lema, 'user-jefe');
    });

    it('rechaza un lema vacío', async () => {
      await expect(service.upsert(2026, '   ', 'user-jefe')).rejects.toThrow(BadRequestException);
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    /**
     * El sistema no puede encabezar documentos de años que no existen todavía:
     * un dedazo de 20262 dejaría una fila inalcanzable.
     */
    it('rechaza un año fuera del rango razonable', async () => {
      await expect(service.upsert(1999, 'Año de algo', 'user-jefe')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('rechaza un lema más largo que el máximo del contrato', async () => {
      await expect(service.upsert(2026, 'A'.repeat(251), 'user-jefe')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.upsert).not.toHaveBeenCalled();
    });
  });
});
