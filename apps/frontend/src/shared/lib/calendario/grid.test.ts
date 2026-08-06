import { describe, it, expect } from 'vitest';
import {
  CELDAS_CUADRICULA_MENSUAL,
  WEEK_DAYS,
  claveDeHoy,
  construirCuadriculaMensual,
  construirSemana,
  formatearFechaClave,
} from './grid';

/**
 * Pruebas de la construcción de cuadrículas del calendario.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Este cálculo vivía dentro de un componente de
 * 1.086 líneas y no podía probarse sin renderizar. Aquí es donde viven los
 * errores que no se ven: cruces de año, meses que empiezan en domingo y febrero
 * bisiesto.
 *
 * Los meses se indican con índice base cero, como en `Date`: 0 es enero y 11 es
 * diciembre.
 */

describe('formatearFechaClave', () => {
  it('rellena mes y día a dos dígitos', () => {
    expect(formatearFechaClave(2026, 0, 5)).toBe('2026-01-05');
  });

  it('convierte el índice de mes a número natural', () => {
    // El índice 11 es diciembre, y la clave debe decir 12.
    expect(formatearFechaClave(2026, 11, 31)).toBe('2026-12-31');
  });
});

describe('construirCuadriculaMensual', () => {
  it('siempre devuelve seis semanas completas', () => {
    // Alto fijo: evita que la interfaz salte al cambiar de mes.
    for (let mes = 0; mes < 12; mes++) {
      expect(construirCuadriculaMensual(2026, mes)).toHaveLength(CELDAS_CUADRICULA_MENSUAL);
    }
  });

  it('marca como propios exactamente los días del mes', () => {
    const celdas = construirCuadriculaMensual(2026, 3); // abril, 30 días

    expect(celdas.filter((c) => c.isCurrentMonth)).toHaveLength(30);
  });

  it('reconoce los 29 días de febrero en año bisiesto', () => {
    const celdas = construirCuadriculaMensual(2024, 1);

    expect(celdas.filter((c) => c.isCurrentMonth)).toHaveLength(29);
  });

  it('reconoce los 28 días de febrero en año común', () => {
    const celdas = construirCuadriculaMensual(2026, 1);

    expect(celdas.filter((c) => c.isCurrentMonth)).toHaveLength(28);
  });

  it('empieza la cuadrícula en domingo', () => {
    const celdas = construirCuadriculaMensual(2026, 5);

    expect(celdas[0].date.getDay()).toBe(0);
  });

  it('no antepone relleno cuando el mes empieza en domingo', () => {
    // Marzo de 2026 empieza en domingo: la primera celda ya es del mes.
    const celdas = construirCuadriculaMensual(2026, 2);

    expect(celdas[0].isCurrentMonth).toBe(true);
    expect(celdas[0].dayNumber).toBe(1);
  });

  describe('cruce de año', () => {
    it('el relleno previo de enero pertenece a diciembre del año anterior', () => {
      const celdas = construirCuadriculaMensual(2026, 0);
      const relleno = celdas.filter((c) => !c.isCurrentMonth && c.dayNumber > 20);

      expect(relleno.length).toBeGreaterThan(0);
      for (const celda of relleno) {
        expect(celda.dateStr).toMatch(/^2025-12-/);
      }
    });

    it('el relleno posterior de diciembre pertenece a enero del año siguiente', () => {
      const celdas = construirCuadriculaMensual(2026, 11);
      const relleno = celdas.filter((c) => !c.isCurrentMonth && c.dayNumber < 15);

      expect(relleno.length).toBeGreaterThan(0);
      for (const celda of relleno) {
        expect(celda.dateStr).toMatch(/^2027-01-/);
      }
    });

    it('el relleno previo de febrero pertenece a enero del mismo año', () => {
      // Comprueba que el ajuste de año sólo se aplica en el cruce, no siempre.
      const celdas = construirCuadriculaMensual(2026, 1);
      const relleno = celdas.filter((c) => !c.isCurrentMonth && c.dayNumber > 20);

      for (const celda of relleno) {
        expect(celda.dateStr).toMatch(/^2026-01-/);
      }
    });
  });

  describe('coherencia entre la clave y la fecha', () => {
    it('la clave textual describe la misma fecha que el objeto Date', () => {
      // Es la propiedad de la que depende cruzar visitas con celdas: si ambas
      // se separaran, el calendario mostraría las visitas en el día equivocado.
      for (const mes of [0, 1, 5, 11]) {
        for (const celda of construirCuadriculaMensual(2026, mes)) {
          const esperada = formatearFechaClave(
            celda.date.getFullYear(),
            celda.date.getMonth(),
            celda.date.getDate(),
          );
          expect(celda.dateStr).toBe(esperada);
        }
      }
    });

    it('construye las fechas al mediodía, para que el horario de verano no desplace el día', () => {
      const celdas = construirCuadriculaMensual(2026, 6);

      for (const celda of celdas) {
        expect(celda.date.getHours()).toBe(12);
      }
    });

    it('no repite claves dentro de una misma cuadrícula', () => {
      const celdas = construirCuadriculaMensual(2026, 1);
      const claves = celdas.map((c) => c.dateStr);

      expect(new Set(claves).size).toBe(claves.length);
    });
  });
});

describe('construirSemana', () => {
  it('devuelve siete días', () => {
    expect(construirSemana(new Date(2026, 3, 15))).toHaveLength(7);
  });

  it('empieza en domingo aunque la fecha caiga a mitad de semana', () => {
    // 15 de abril de 2026 es miércoles.
    const semana = construirSemana(new Date(2026, 3, 15));

    expect(semana[0].date.getDay()).toBe(0);
    expect(semana[0].name).toBe('DOM');
  });

  it('incluye la fecha consultada', () => {
    const semana = construirSemana(new Date(2026, 3, 15));

    expect(semana.map((d) => d.dateStr)).toContain('2026-04-15');
  });

  it('etiqueta los días en orden de domingo a sábado', () => {
    const semana = construirSemana(new Date(2026, 3, 15));

    expect(semana.map((d) => d.name)).toEqual([...WEEK_DAYS]);
  });

  it('cruza el final de mes sin saltarse días', () => {
    // 30 de abril de 2026 es jueves: la semana llega hasta mayo.
    const semana = construirSemana(new Date(2026, 3, 30));

    expect(semana.map((d) => d.dateStr)).toEqual([
      '2026-04-26',
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      '2026-05-02',
    ]);
  });

  it('cruza el final de año', () => {
    const semana = construirSemana(new Date(2026, 11, 31));

    expect(semana.some((d) => d.dateStr.startsWith('2027-01'))).toBe(true);
  });

  it('no altera la fecha que recibe', () => {
    // El cálculo usa `setDate`, que muta: sin la copia previa le cambiaría la
    // fecha al componente que la pasó.
    const fecha = new Date(2026, 3, 15);
    const original = fecha.getTime();

    construirSemana(fecha);

    expect(fecha.getTime()).toBe(original);
  });

  it('devuelve días consecutivos', () => {
    const semana = construirSemana(new Date(2026, 1, 25));

    for (let i = 1; i < semana.length; i++) {
      const anterior = semana[i - 1].date;
      const actual = semana[i].date;
      const diferenciaDias = Math.round(
        (actual.getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diferenciaDias).toBe(1);
    }
  });
});

describe('claveDeHoy', () => {
  it('formatea la fecha indicada como clave', () => {
    expect(claveDeHoy(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('usa el reloj del sistema cuando no se indica fecha', () => {
    const hoy = new Date();
    const esperada = formatearFechaClave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    expect(claveDeHoy()).toBe(esperada);
  });
});
