import { describe, it, expect } from 'vitest';
import {
  esFechaDeHoy,
  esFechaDeEstaSemana,
  esFechaDeEsteMes,
  coincideConPeriodo,
  calcularConteosPorPeriodo,
  rangoDePeriodo,
} from './filtro-temporal';

describe('filtro-temporal', () => {
  // Viernes 14 de Agosto 2026 a las 15:30
  const ahora = new Date(2026, 7, 14, 15, 30, 0);

  describe('esFechaDeHoy', () => {
    it('detecta fechas coincidentes con el día actual', () => {
      expect(esFechaDeHoy('2026-08-14', ahora)).toBe(true);
      expect(esFechaDeHoy('2026-08-14T09:00:00', ahora)).toBe(true);
    });

    it('rechaza fechas de otros días o inválidas', () => {
      expect(esFechaDeHoy('2026-08-13', ahora)).toBe(false);
      expect(esFechaDeHoy('2026-08-15', ahora)).toBe(false);
      expect(esFechaDeHoy('', ahora)).toBe(false);
      expect(esFechaDeHoy(null, ahora)).toBe(false);
    });
  });

  describe('esFechaDeEstaSemana', () => {
    // La semana del 14/08/2026 va del Lunes 10/08/2026 al Domingo 16/08/2026
    it('detecta fechas que caen dentro de la semana lunes-domingo', () => {
      expect(esFechaDeEstaSemana('2026-08-10', ahora)).toBe(true); // Lunes
      expect(esFechaDeEstaSemana('2026-08-14', ahora)).toBe(true); // Viernes (hoy)
      expect(esFechaDeEstaSemana('2026-08-16', ahora)).toBe(true); // Domingo
    });

    it('rechaza fechas fuera de la semana', () => {
      expect(esFechaDeEstaSemana('2026-08-09', ahora)).toBe(false); // Domingo anterior
      expect(esFechaDeEstaSemana('2026-08-17', ahora)).toBe(false); // Lunes siguiente
    });
  });

  describe('esFechaDeEsteMes', () => {
    it('detecta fechas que caen dentro del mes en curso', () => {
      expect(esFechaDeEsteMes('2026-08-01', ahora)).toBe(true);
      expect(esFechaDeEsteMes('2026-08-31', ahora)).toBe(true);
    });

    it('rechaza fechas de otros meses o años', () => {
      expect(esFechaDeEsteMes('2026-07-31', ahora)).toBe(false);
      expect(esFechaDeEsteMes('2026-09-01', ahora)).toBe(false);
      expect(esFechaDeEsteMes('2025-08-14', ahora)).toBe(false);
    });
  });

  describe('coincideConPeriodo', () => {
    it('TODOS siempre devuelve true para cualquier fecha válida', () => {
      expect(coincideConPeriodo('2025-01-01', 'TODOS', ahora)).toBe(true);
      expect(coincideConPeriodo('2026-08-14', 'TODOS', ahora)).toBe(true);
    });

    it('filtra según el modo seleccionado', () => {
      expect(coincideConPeriodo('2026-08-14', 'HOY', ahora)).toBe(true);
      expect(coincideConPeriodo('2026-08-13', 'HOY', ahora)).toBe(false);

      expect(coincideConPeriodo('2026-08-12', 'ESTA_SEMANA', ahora)).toBe(true);
      expect(coincideConPeriodo('2026-08-01', 'ESTA_SEMANA', ahora)).toBe(false);

      expect(coincideConPeriodo('2026-08-01', 'ESTE_MES', ahora)).toBe(true);
      expect(coincideConPeriodo('2026-07-31', 'ESTE_MES', ahora)).toBe(false);
    });
  });

  describe('rangoDePeriodo', () => {
    // ¿El timestamp cae dentro del rango [desde, hasta]?
    const dentro = (iso: string, r: { fechaDesde?: string; fechaHasta?: string }) =>
      !!r.fechaDesde &&
      !!r.fechaHasta &&
      new Date(iso) >= new Date(r.fechaDesde) &&
      new Date(iso) <= new Date(r.fechaHasta);

    it('TODOS no acota fechas', () => {
      expect(rangoDePeriodo('TODOS', ahora)).toEqual({});
    });

    it('HOY cubre el día de hoy y excluye ayer', () => {
      const r = rangoDePeriodo('HOY', ahora);
      expect(dentro('2026-08-14T10:00:00', r)).toBe(true);
      expect(dentro('2026-08-13T23:00:00', r)).toBe(false);
      expect(dentro('2026-08-15T00:30:00', r)).toBe(false);
    });

    it('ESTE_MES cubre todo agosto y excluye julio/septiembre', () => {
      const r = rangoDePeriodo('ESTE_MES', ahora);
      expect(dentro('2026-08-01T08:00:00', r)).toBe(true);
      expect(dentro('2026-08-31T20:00:00', r)).toBe(true);
      expect(dentro('2026-07-31T20:00:00', r)).toBe(false);
      expect(dentro('2026-09-01T08:00:00', r)).toBe(false);
    });

    it('coincide con coincideConPeriodo (mismos límites que las píldoras)', () => {
      for (const filtro of ['HOY', 'ESTA_SEMANA', 'ESTE_MES'] as const) {
        const r = rangoDePeriodo(filtro, ahora);
        for (const iso of [
          '2026-08-14T10:00:00',
          '2026-08-12T10:00:00',
          '2026-08-01T10:00:00',
          '2026-07-15T10:00:00',
        ]) {
          expect(dentro(iso, r)).toBe(coincideConPeriodo(iso, filtro, ahora));
        }
      }
    });
  });

  describe('calcularConteosPorPeriodo', () => {
    it('calcula los conteos correctamente', () => {
      const visitas = [
        { fechaHora: '2026-08-14' }, // Hoy, esta semana, este mes
        { fechaHora: '2026-08-12' }, // Esta semana, este mes
        { fechaHora: '2026-08-01' }, // Este mes
        { fechaHora: '2026-07-15' }, // Otro mes
      ];

      const conteos = calcularConteosPorPeriodo(visitas, ahora);

      expect(conteos).toEqual({
        TODOS: 4,
        HOY: 1,
        ESTA_SEMANA: 2,
        ESTE_MES: 3,
      });
    });
  });
});
