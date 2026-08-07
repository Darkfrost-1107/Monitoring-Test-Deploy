import { describe, it, expect } from 'vitest';
import {
  CARGOS_DE_MONITOREO,
  DOCENTE_DE_AULA,
  cargoVigente,
  esCargoDeMonitoreo,
  tieneElCargo,
  filtroDelPadron,
  type DocenteDelPadron,
} from './padron-docentes';

/**
 * El filtro del padrón de docentes y el estado de su cargo. Vivía dentro de
 * `docentes-table.tsx`, una tabla de 303 líneas, sin una sola prueba pese a
 * decidir qué filas aparecen en seis pantallas distintas.
 */

const docente = (over: Partial<DocenteDelPadron> = {}): DocenteDelPadron => ({
  nombres: 'Ana',
  apellidos: 'Torres',
  dni: '12345678',
  cargo: DOCENTE_DE_AULA,
  condicion: 'Nombrado',
  nivelEducativo: 'Secundaria',
  secciones: [],
  ...over,
});

const params = (busqueda: Record<string, string> = {}) => new URLSearchParams(busqueda);

describe('esCargoDeMonitoreo', () => {
  it.each(CARGOS_DE_MONITOREO)('%s levanta fichas', (cargo) => {
    expect(esCargoDeMonitoreo(cargo)).toBe(true);
  });

  it('el docente de aula no', () => {
    expect(esCargoDeMonitoreo(DOCENTE_DE_AULA)).toBe(false);
  });
});

describe('cargoVigente', () => {
  it('prefiere la designación abierta sobre una ya finalizada', () => {
    const cargos = [
      { id: 'viejo', nombre: 'Director', fechaFin: '2025-12-31' },
      { id: 'vigente', nombre: 'Director', fechaFin: null },
    ];
    expect(cargoVigente(docente({ cargosList: cargos }), 'Director')?.id).toBe('vigente');
  });

  /**
   * Cuando sólo hay designaciones cerradas se devuelve una igual: la fila
   * tiene que poder mostrarse como «Cargo Finalizado» en vez de desaparecer.
   */
  it('devuelve la finalizada cuando no hay ninguna abierta', () => {
    const cargos = [{ id: 'viejo', nombre: 'Director', fechaFin: '2025-12-31' }];
    expect(cargoVigente(docente({ cargosList: cargos }), 'Director')?.id).toBe('viejo');
  });

  it('no devuelve la designación de otro cargo', () => {
    const cargos = [{ id: 'otro', nombre: 'Jefe de Taller', fechaFin: null }];
    expect(cargoVigente(docente({ cargosList: cargos }), 'Director')).toBeNull();
  });

  it('devuelve nulo sin historial de cargos', () => {
    expect(cargoVigente(docente(), 'Director')).toBeNull();
  });
});

describe('tieneElCargo', () => {
  it('lo tiene cuando figura en el historial con designación abierta', () => {
    const d = docente({ cargosList: [{ id: 'c', nombre: 'Director', fechaFin: null }] });
    expect(tieneElCargo(d, 'Director')).toBe(true);
  });

  it('no lo tiene cuando la designación está cerrada', () => {
    const d = docente({ cargosList: [{ id: 'c', nombre: 'Director', fechaFin: '2025-12-31' }] });
    expect(tieneElCargo(d, 'Director')).toBe(false);
  });

  it('sin historial cae al cargo declarado en el registro', () => {
    expect(tieneElCargo(docente({ cargo: 'Director' }), 'Director')).toBe(true);
    expect(tieneElCargo(docente({ cargo: DOCENTE_DE_AULA }), 'Director')).toBe(false);
  });

  /**
   * «Docente de aula» se define por descarte: lo es quien no tiene ninguna
   * designación de monitoreo abierta.
   */
  it('es docente de aula quien no tiene ningún cargo de monitoreo vigente', () => {
    const conCargoCerrado = docente({
      cargo: 'Director',
      cargosList: [{ id: 'c', nombre: 'Director', fechaFin: '2025-12-31' }],
    });
    expect(tieneElCargo(conCargoCerrado, DOCENTE_DE_AULA)).toBe(true);
  });

  it('no es docente de aula quien tiene una designación de monitoreo abierta', () => {
    const conCargo = docente({
      cargosList: [{ id: 'c', nombre: 'Coordinador Pedagógico', fechaFin: null }],
    });
    expect(tieneElCargo(conCargo, DOCENTE_DE_AULA)).toBe(false);
  });
});

describe('filtroDelPadron', () => {
  const pasa = (d: DocenteDelPadron, busqueda: Record<string, string> = {}) =>
    filtroDelPadron(DOCENTE_DE_AULA)(d, params(busqueda));

  it('sin filtros deja pasar a quien tiene el cargo', () => {
    expect(pasa(docente())).toBe(true);
  });

  it('busca por nombres, apellidos y DNI', () => {
    expect(pasa(docente(), { search: 'ana' })).toBe(true);
    expect(pasa(docente(), { search: 'TORRES' })).toBe(true);
    expect(pasa(docente(), { search: '1234' })).toBe(true);
    expect(pasa(docente(), { search: 'quispe' })).toBe(false);
  });

  it('acota por condición laboral', () => {
    expect(pasa(docente(), { condicion: 'Nombrado' })).toBe(true);
    expect(pasa(docente(), { condicion: 'Contratado' })).toBe(false);
  });

  it('acota por sección a cargo', () => {
    const d = docente({ secciones: [{ id: 's1', grado: '3ro', seccion: 'A' }] });
    expect(filtroDelPadron(DOCENTE_DE_AULA)(d, params({ seccion: '3ro A' }))).toBe(true);
    expect(filtroDelPadron(DOCENTE_DE_AULA)(d, params({ seccion: '4to B' }))).toBe(false);
  });

  it('acota por nivel educativo sin distinguir mayúsculas', () => {
    expect(pasa(docente(), { nivelEducativo: 'secundaria' })).toBe(true);
    expect(pasa(docente(), { nivelEducativo: 'PRIMARIA' })).toBe(false);
  });

  it('descarta a quien no tiene el cargo pedido', () => {
    const director = docente({
      cargosList: [{ id: 'c', nombre: 'Director', fechaFin: null }],
    });
    expect(filtroDelPadron('Director')(director, params())).toBe(true);
    expect(filtroDelPadron('Jefe de Taller')(director, params())).toBe(false);
  });

  it('combina todos los criterios', () => {
    const d = docente({
      nombres: 'Luis',
      condicion: 'Destacado',
      secciones: [{ id: 's1', grado: '5to', seccion: 'C' }],
    });
    const busqueda = {
      search: 'luis',
      condicion: 'Destacado',
      seccion: '5to C',
      nivelEducativo: 'Secundaria',
    };
    expect(filtroDelPadron(DOCENTE_DE_AULA)(d, params(busqueda))).toBe(true);
    // Basta con que uno de los criterios no coincida.
    expect(filtroDelPadron(DOCENTE_DE_AULA)(d, params({ ...busqueda, search: 'ana' }))).toBe(false);
  });
});
