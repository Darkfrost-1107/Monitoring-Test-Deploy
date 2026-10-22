import { describe, it, expect } from 'vitest';
import {
  monitoresDelReporte,
  origenDelMonitor,
  cargoAbreviado,
  rotuloDeMonitor,
  grupoDeMonitor,
} from './monitores-del-reporte';

/**
 * Quién realizó los monitoreos que se están analizando: el especialista o el
 * director (o el coordinador o jefe de taller) que levantó cada ficha. Es la lista
 * de opciones del filtro «Monitor».
 */

const ficha = <T extends object = object>(
  monitorId: string,
  especialista: string,
  especialistaCargo?: string,
  extra?: T,
) => ({
  monitorId,
  especialista,
  especialistaCargo,
  ...(extra as T),
});

describe('monitoresDelReporte', () => {
  it('lista a cada monitor una sola vez, aunque haya varias fichas suyas', () => {
    const r = monitoresDelReporte([
      ficha('m1', 'Pedro Mamani'),
      ficha('m1', 'Pedro Mamani'),
      ficha('m2', 'Ana Torres'),
    ]);

    expect(r).toHaveLength(2);
  });

  it('los ordena por nombre', () => {
    const r = monitoresDelReporte([ficha('m1', 'Pedro Mamani'), ficha('m2', 'Ana Torres')]);

    expect(r.map((m) => m.nombre)).toEqual(['Ana Torres', 'Pedro Mamani']);
  });

  it('identifica a cada uno por su id, no por su nombre: dos homónimos son dos monitores', () => {
    const r = monitoresDelReporte([ficha('m1', 'Juan Pérez'), ficha('m2', 'Juan Pérez')]);

    expect(r.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('descarta las fichas sin monitor identificado', () => {
    const r = monitoresDelReporte([ficha('', 'Sin id'), ficha('m1', 'Ana Torres')]);

    expect(r).toEqual([
      { id: 'm1', nombre: 'Ana Torres', cargo: undefined, origen: undefined },
    ]);
  });

  it('sin fichas no hay monitores', () => {
    expect(monitoresDelReporte([])).toEqual([]);
  });

  it('acepta un criterio para acotar qué fichas cuentan', () => {
    const r = monitoresDelReporte(
      [
        ficha('m1', 'Ana', undefined, { nivel: 'Primaria' }),
        ficha('m2', 'Beto', undefined, { nivel: 'Secundaria' }),
      ],
      (f) => f.nivel === 'Secundaria',
    );

    expect(r).toEqual([
      { id: 'm2', nombre: 'Beto', cargo: undefined, origen: undefined },
    ]);
  });

  it('clasifica y ordena monitores internos de I.E. antes que externos de UGEL', () => {
    const r = monitoresDelReporte([
      ficha('m1', 'Zulema Especialista', 'Especialista'),
      ficha('m2', 'Carlos Director', 'Director'),
      ficha('m3', 'Ana Coordinadora', 'Coordinador Pedagógico'),
      ficha('m4', 'Beto Especialista', 'Especialista en Educación'),
    ]);

    // Internos primero (Ana, Carlos), luego externos (Beto, Zulema)
    expect(r.map((m) => `${m.nombre} (${m.origen})`)).toEqual([
      'Ana Coordinadora (INTERNO)',
      'Carlos Director (INTERNO)',
      'Beto Especialista (EXTERNO)',
      'Zulema Especialista (EXTERNO)',
    ]);
  });

  it('conserva el cargo si una ficha posterior del mismo monitor lo aporta', () => {
    const r = monitoresDelReporte([
      ficha('m1', 'Carlos Mendoza', undefined),
      ficha('m1', 'Carlos Mendoza', 'Director'),
    ]);

    expect(r[0].cargo).toBe('Director');
    expect(r[0].origen).toBe('INTERNO');
  });
});

describe('origenDelMonitor y grupoDeMonitor', () => {
  it('identifica cargos internos de la I.E.', () => {
    expect(origenDelMonitor('Director')).toBe('INTERNO');
    expect(origenDelMonitor('Directora')).toBe('INTERNO');
    expect(origenDelMonitor('Subdirector')).toBe('INTERNO');
    expect(origenDelMonitor('Coordinador Pedagógico')).toBe('INTERNO');
    expect(origenDelMonitor('Jefe de Taller')).toBe('INTERNO');
  });

  it('identifica cargos externos de la UGEL', () => {
    expect(origenDelMonitor('Especialista')).toBe('EXTERNO');
    expect(origenDelMonitor('Especialista UGEL')).toBe('EXTERNO');
    expect(origenDelMonitor('Jefe de Área')).toBe('EXTERNO');
    expect(origenDelMonitor('Jefe de Gestión Pedagógica')).toBe('EXTERNO');
  });

  it('devuelve undefined para cargos vacíos o nulos', () => {
    expect(origenDelMonitor(undefined)).toBeUndefined();
    expect(origenDelMonitor('')).toBeUndefined();
  });

  it('retorna el grupo de optgroup adecuado', () => {
    expect(grupoDeMonitor({ cargo: 'Director' })).toBe('INTERNO (I.E.)');
    expect(grupoDeMonitor({ cargo: 'Especialista' })).toBe('EXTERNO (UGEL)');
    expect(grupoDeMonitor({})).toBeUndefined();
  });
});

describe('cargoAbreviado y rotuloDeMonitor', () => {
  it('abrevia cargos comunes para mantener el select compacto', () => {
    expect(cargoAbreviado('Director')).toBe('(Dir.)');
    expect(cargoAbreviado('Subdirector')).toBe('(Subdir.)');
    expect(cargoAbreviado('Coordinador Pedagógico')).toBe('(Coord.)');
    expect(cargoAbreviado('Jefe de Taller')).toBe('(Taller)');
    expect(cargoAbreviado('Especialista')).toBe('(Especialista)');
    expect(cargoAbreviado('Jefe de Gestión')).toBe('(Jefe Gestión)');
    expect(cargoAbreviado('Jefe de Área')).toBe('(Jefe Área)');
  });

  it('formatea el rótulo completo del monitor con su abreviatura', () => {
    expect(rotuloDeMonitor({ nombre: 'Carlos Mendoza', cargo: 'Director' })).toBe(
      'Carlos Mendoza (Dir.)',
    );
    expect(rotuloDeMonitor({ nombre: 'Pedro Mamani', cargo: 'Especialista' })).toBe(
      'Pedro Mamani (Especialista)',
    );
    expect(rotuloDeMonitor({ nombre: 'Ana Torres' })).toBe('Ana Torres');
  });
});
