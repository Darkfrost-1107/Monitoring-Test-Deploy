import { describe, it, expect } from 'vitest';
import {
  normalizarNivelLogro,
  calcularAnalisisPorCriterios,
} from './analisis-desempeno';
import type { BackendReportVisit } from '@/widgets/reportes';
import type { Plantilla } from '@/entities/model-plantillas';

describe('normalizarNivelLogro', () => {
  it('normaliza strings con nombres estándar y romanos', () => {
    expect(normalizarNivelLogro('NIVEL_I')).toBe('I');
    expect(normalizarNivelLogro('INICIO')).toBe('I');
    expect(normalizarNivelLogro('NIVEL_II')).toBe('II');
    expect(normalizarNivelLogro('EN_PROCESO')).toBe('II');
    expect(normalizarNivelLogro('NIVEL_III')).toBe('III');
    expect(normalizarNivelLogro('LOGRO_ESPERADO')).toBe('III');
    expect(normalizarNivelLogro('SATISFACTORIO')).toBe('III');
    expect(normalizarNivelLogro('NIVEL_IV')).toBe('IV');
    expect(normalizarNivelLogro('LOGRO_DESTACADO')).toBe('IV');
    expect(normalizarNivelLogro('DESTACADO')).toBe('IV');
  });

  it('infiere nivel a partir del promedio si no hay string', () => {
    expect(normalizarNivelLogro(undefined, 1.5)).toBe('I');
    expect(normalizarNivelLogro(undefined, 2.5)).toBe('II');
    expect(normalizarNivelLogro(undefined, 3.2)).toBe('III');
    expect(normalizarNivelLogro(undefined, 3.8)).toBe('IV');
  });

  /** Cerraba con `return 'II'`: una ficha sin datos salía «En proceso». */
  it('devuelve nulo cuando la ficha no declara nivel ni promedio', () => {
    expect(normalizarNivelLogro()).toBeNull();
    expect(normalizarNivelLogro(undefined, Number.NaN)).toBeNull();
    expect(normalizarNivelLogro('ALGO_QUE_NO_MAPEA')).toBeNull();
  });
});

const crearVisita = (overrides: Partial<BackendReportVisit>): BackendReportVisit => ({
  id: 'v-default',
  tipo: 'DOCENTE',
  docenteDirectivo: 'Docente Test',
  institucion: 'IE 100',
  institucionId: 'ie-100',
  especialista: 'Esp 1',
  especialistaInitials: 'E1',
  monitorId: 'm-1',
  nroVisita: '1',
  fechaHora: '2026-08-10T10:00:00Z',
  nivel: 'Primaria',
  modalidad: 'EBR',
  estado: 'COMPLETADO',
  anioAcademico: 2026,
  ...overrides,
});

describe('calcularAnalisisPorCriterios', () => {
  it('maneja listas vacías correctamente para docente, eib y directivo', () => {
    const resDoc = calcularAnalisisPorCriterios([], [], [], 'DOCENTE');
    expect(resDoc.totalEvaluaciones).toBe(0);
    expect(resDoc.promedioGeneral).toBe(0);
    expect(resDoc.criterios.length).toBe(3);
    expect(resDoc.criterios[0].nombre).toContain('Involucra activamente');

    const resEib = calcularAnalisisPorCriterios([], [], [], 'DOCENTE_EIB');
    expect(resEib.totalEvaluaciones).toBe(0);
    expect(resEib.promedioGeneral).toBe(0);
    expect(resEib.criterios.length).toBe(4);
    expect(resEib.criterios[0].nombre).toContain('Condiciones básicas');

    const resDir = calcularAnalisisPorCriterios([], [], [], 'DIRECTIVO');
    expect(resDir.totalEvaluaciones).toBe(0);
    expect(resDir.promedioGeneral).toBe(0);
    expect(resDir.criterios.length).toBe(3);
    expect(resDir.criterios[0].nombre).toContain('liderazgo pedagógico');
  });

  /**
   * ── El defecto que motivó estas pruebas ──
   * El camino de estimación no tiene con qué calcular una distribución por
   * criterio: de cada ficha sólo conoce su nivel de logro GLOBAL. Aun así
   * repartía ese único nivel entre todos los criterios y después lo alteraba
   * según la paridad del índice del arreglo:
   *
   *     if (index === 0 && nivelAsignado === 2 && i % 2 === 0) nivelAsignado = 3;
   *     if (index === 2 && nivelAsignado === 3 && i % 3 === 0) nivelAsignado = 2;
   *
   * Eso no es un cálculo degradado: es variación inventada para que el gráfico
   * del análisis oficial se viera distribuido. Ahora la estimación informa la
   * estructura de criterios y declara que no tiene el desglose.
   */
  describe('sin desglose del backend', () => {
    const dosFichas = [
      crearVisita({ id: 'v-1', nivelLogro: 'NIVEL_II', promedio: 2.4 }),
      crearVisita({ id: 'v-2', nivelLogro: 'NIVEL_II', promedio: 2.4 }),
    ];

    it('declara que no tiene el desglose por criterio', () => {
      const res = calcularAnalisisPorCriterios([], dosFichas, [], 'DOCENTE');

      expect(res.sinDesglosePorCriterio).toBe(true);
    });

    it('no reporta ninguna distribución de niveles', () => {
      const res = calcularAnalisisPorCriterios([], dosFichas, [], 'DOCENTE');

      for (const criterio of res.criterios) {
        expect([
          criterio.conteoNivelI,
          criterio.conteoNivelII,
          criterio.conteoNivelIII,
          criterio.conteoNivelIV,
        ]).toEqual([0, 0, 0, 0]);
        expect(criterio.promedio).toBe(0);
        expect(criterio.tasaLogro).toBe(0);
        expect(criterio.tasaRefuerzo).toBe(0);
      }
    });

    /** Con fichas idénticas, dos criterios no pueden diferir: era el hack de paridad. */
    it('no inventa diferencias entre criterios a partir del índice', () => {
      const res = calcularAnalisisPorCriterios([], dosFichas, [], 'DOCENTE');
      const distribuciones = res.criterios.map((c) =>
        [c.conteoNivelI, c.conteoNivelII, c.conteoNivelIII, c.conteoNivelIV].join('-'),
      );

      expect(new Set(distribuciones).size).toBe(1);
    });

    it('no elige criterio de mayor dominio ni de mayor refuerzo', () => {
      const res = calcularAnalisisPorCriterios([], dosFichas, [], 'DOCENTE');

      expect(res.criterioMayorDominio).toBeNull();
      expect(res.criterioMayorRefuerzo).toBeNull();
      expect(res.promedioGeneral).toBe(0);
    });

    /** Cuántas fichas hay sí se sabe: es lo único real que tiene este camino. */
    it('informa cuántas fichas encontró', () => {
      const res = calcularAnalisisPorCriterios([], dosFichas, [], 'DOCENTE');

      expect(res.totalEvaluaciones).toBe(2);
    });

    it('sigue mostrando la estructura de criterios del instrumento', () => {
      const res = calcularAnalisisPorCriterios([], dosFichas, [], 'DOCENTE_EIB');

      expect(res.criterios.length).toBe(4);
      expect(res.criterios[0].nombre).toContain('Condiciones básicas');
    });
  });

  describe('con desglose del backend', () => {
    const criterioBackend = {
      desempenoId: 'd-1',
      nombre: 'Involucra activamente a los estudiantes',
      orden: 1,
      descripcionCorta: 'x',
      totalEvaluados: 4,
      conteoNivelI: 1,
      conteoNivelII: 1,
      conteoNivelIII: 1,
      conteoNivelIV: 1,
      porcentajeNivelI: 25,
      porcentajeNivelII: 25,
      porcentajeNivelIII: 25,
      porcentajeNivelIV: 25,
      promedio: 2.5,
      tasaLogro: 50,
      tasaRefuerzo: 50,
    };

    it('usa los criterios reales y no marca falta de desglose', () => {
      const res = calcularAnalisisPorCriterios([criterioBackend], [], [], 'DOCENTE');

      expect(res.sinDesglosePorCriterio).toBe(false);
      expect(res.criterios).toEqual([criterioBackend]);
      expect(res.totalEvaluaciones).toBe(4);
      expect(res.criterioMayorDominio).not.toBeNull();
    });
  });

  /**
   * Regresión del bug de precedencia de `a016111`: `t === 'DOCENTE' ||
   * t.includes('DOCENTE') && !t.includes('EIB')` sin paréntesis hacía que toda
   * plantilla docente —EIB incluida— entrara por la primera rama.
   */
  describe('elección de la plantilla del instrumento', () => {
    const plantilla = (tipoMonitoreo: string, nombreDesempeno: string): Plantilla => ({
      id: `p-${tipoMonitoreo}`,
      tipoMonitoreo,
      anioAcademico: 2026,
      lema: null,
      baremo: 'Vigente',
      niveles: [],
      desempenos: [
        {
          id: `d-${tipoMonitoreo}`,
          nombre: nombreDesempeno,
          descripcionCorta: '',
          aspectos: [],
          rubrica: [],
        },
      ],
      fechaCreacion: '2026-01-01',
      fechaActualizacion: '2026-01-01',
      version: 1,
      estado: 'Vigente',
      descripcion: '',
    });

    const catalogo = [
      plantilla('DOCENTE_EIB', 'Criterio EIB'),
      plantilla('DOCENTE', 'Criterio regular'),
    ];

    it('el filtro docente no toma la plantilla EIB', () => {
      const res = calcularAnalisisPorCriterios([], [], catalogo, 'DOCENTE');

      expect(res.criterios.map((c) => c.nombre)).toEqual(['Criterio regular']);
    });

    it('el filtro EIB toma la plantilla EIB', () => {
      const res = calcularAnalisisPorCriterios([], [], catalogo, 'DOCENTE_EIB');

      expect(res.criterios.map((c) => c.nombre)).toEqual(['Criterio EIB']);
    });

    it('no se confunde aunque la EIB esté primera en el catálogo', () => {
      const res = calcularAnalisisPorCriterios([], [], catalogo, 'DOCENTE');

      expect(res.criterios.some((c) => c.nombre.includes('EIB'))).toBe(false);
    });
  });

  it('calcula métricas agregadas por criterio / desempeño', () => {
    const mockVisitas: BackendReportVisit[] = [
      crearVisita({
        id: 'v-1',
        tipo: 'DOCENTE',
        docenteDirectivo: 'Juan Perez',
        institucion: 'IE 100',
        especialista: 'Esp 1',
        fechaHora: '2026-08-10T10:00:00Z',
        nivelLogro: 'NIVEL_I',
        promedio: 1.8,
        puntajeTotal: 7,
      }),
      crearVisita({
        id: 'v-2',
        tipo: 'DOCENTE',
        docenteDirectivo: 'Maria Gomez',
        institucion: 'IE 200',
        especialista: 'Esp 1',
        fechaHora: '2026-08-11T10:00:00Z',
        nivelLogro: 'NIVEL_II',
        promedio: 2.6,
        puntajeTotal: 10,
      }),
      crearVisita({
        id: 'v-3',
        tipo: 'DOCENTE',
        docenteDirectivo: 'Carlos Ramos',
        institucion: 'IE 100',
        especialista: 'Esp 2',
        fechaHora: '2026-08-12T10:00:00Z',
        nivelLogro: 'NIVEL_III',
        promedio: 3.4,
        puntajeTotal: 14,
      }),
      crearVisita({
        id: 'v-4',
        tipo: 'DOCENTE',
        docenteDirectivo: 'Ana Lopez',
        institucion: 'IE 300',
        especialista: 'Esp 2',
        fechaHora: '2026-08-13T10:00:00Z',
        nivelLogro: 'NIVEL_IV',
        promedio: 3.9,
        puntajeTotal: 16,
      }),
    ];

    const res = calcularAnalisisPorCriterios([], mockVisitas, [], 'DOCENTE');

    expect(res.totalEvaluaciones).toBe(4);
    expect(res.criterios.length).toBe(3);
    expect(res.criterios[0].nombre).toContain('Involucra activamente');
    expect(res.criterios[1].nombre).toContain('Maximiza el tiempo');
    expect(res.criterios[2].nombre).toContain('Fomenta el razonamiento');

    // Cuatro fichas con cuatro niveles distintos, pero sin desglose por
    // criterio: la estructura se informa y la distribución no se inventa.
    expect(res.sinDesglosePorCriterio).toBe(true);
    expect(res.criterioMayorDominio).toBeNull();
    expect(res.criterioMayorRefuerzo).toBeNull();
  });
});
