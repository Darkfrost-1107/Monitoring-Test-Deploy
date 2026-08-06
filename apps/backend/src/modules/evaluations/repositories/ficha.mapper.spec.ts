import { fromPrismaFicha, mapContexto } from './ficha.mapper.js';

/**
 * Pruebas de caracterización del mapeo de fichas de monitoreo.
 *
 * Fase 3 de PLAN_REMEDIACION.md. La ficha es el documento central del dominio y
 * este mapper es la frontera entre la fila de base de datos y el contrato que
 * consume el frontend. Estaba en 0 %.
 *
 * Es transformación pura, de modo que no hace falta doblar Prisma: lo que se
 * verifica son las conversiones, y en particular las que no son evidentes al
 * leer el código —una cadena vacía se convierte en nulo, un decimal de Prisma
 * en número, y una plantilla histórica marca la ficha para migración—.
 */

const contexto = (over: Record<string, unknown> = {}) => ({
  id: 'ctx-1',
  areaCurricular: 'Matemática',
  grado: '3',
  seccion: 'A',
  cantidadEstudiantes: 28,
  cantidadEstudiantesNee: 2,
  cursoId: 'curso-1',
  ...over,
});

const fila = (over: Record<string, unknown> = {}) => ({
  id: 'f-1',
  cronogramaId: 'c-1',
  plantillaId: 'p-1',
  fichaContextoId: 'ctx-1',
  anioAcademico: 2026,
  puntajeTotal: 54,
  promedio: 18,
  nivelLogro: 'LOGRO_ESPERADO',
  estado: 'FINALIZADO',
  creadoPorId: 'u-1',
  finalizadaPorId: 'u-1',
  observaciones: 'Observación',
  sugerencias: 'Sugerencia',
  compromisos: 'Compromiso',
  evidenciaGeneral: 'https://ejemplo/evidencia.pdf',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  finalizadaAt: new Date('2026-03-02T15:30:00.000Z'),
  fichaContexto: contexto(),
  respuestasDesempeno: [],
  respuestasAspecto: [],
  respuestasEjeItem: [],
  plantilla: { id: 'p-1', version: 3, estado: 'Vigente' },
  ...over,
});

const mapear = (over: Record<string, unknown> = {}) =>
  fromPrismaFicha(fila(over) as unknown as Parameters<typeof fromPrismaFicha>[0]);

describe('fromPrismaFicha', () => {
  describe('migración de plantilla', () => {
    it('marca para migración la ficha cuya plantilla quedó histórica', () => {
      // Una plantilla pasa a «Historico» al publicarse una versión nueva. La
      // ficha levantada con la anterior debe migrarse antes de continuar.
      const f = mapear({ plantilla: { id: 'p-1', version: 2, estado: 'Historico' } });

      expect(f.requiereMigracion).toBe(true);
      expect(f.plantillaHistoricaId).toBe('p-1');
    });

    it('no marca la ficha cuya plantilla sigue vigente', () => {
      const f = mapear();

      expect(f.requiereMigracion).toBe(false);
      expect(f.plantillaHistoricaId).toBeNull();
    });

    it('trata como no migrable la ficha sin plantilla asociada', () => {
      const f = mapear({ plantilla: null });

      expect(f.requiereMigracion).toBe(false);
      expect(f.plantillaVersion).toBe(0);
    });
  });

  describe('conversión de tipos', () => {
    it('convierte el decimal del promedio en número', () => {
      // Prisma devuelve Decimal para campos numéricos con precisión; el
      // contrato declara `number`. Sin la conversión el frontend recibiría un
      // objeto y las comparaciones fallarían en silencio.
      const f = mapear({ promedio: { toString: () => '17.5' } });

      expect(f.promedio).toBe(17.5);
      expect(typeof f.promedio).toBe('number');
    });

    it('convierte las fechas a cadena ISO', () => {
      const f = mapear();

      expect(f.createdAt).toBe('2026-03-01T10:00:00.000Z');
      expect(f.finalizadaAt).toBe('2026-03-02T15:30:00.000Z');
    });

    it('deja en nulo la fecha de finalización de una ficha en curso', () => {
      const f = mapear({ finalizadaAt: null, estado: 'EN_PROCESO' });

      expect(f.finalizadaAt).toBeNull();
    });
  });

  describe('campos de texto opcionales', () => {
    it.each([['sugerencias'], ['compromisos'], ['evidenciaGeneral']])(
      'convierte %s vacío en nulo',
      (campo) => {
        // El `|| null` del mapper hace que una cadena vacía llegue como nulo al
        // frontend. Distinguir «sin completar» de «completado en blanco» depende
        // de esta conversión, que no es evidente al leer el código.
        const f = mapear({ [campo]: '' });

        expect(f[campo as 'sugerencias' | 'compromisos' | 'evidenciaGeneral']).toBeNull();
      },
    );

    it('conserva el texto cuando sí tiene contenido', () => {
      const f = mapear();

      expect(f.sugerencias).toBe('Sugerencia');
      expect(f.compromisos).toBe('Compromiso');
    });

    it('no aplica esa conversión a observaciones', () => {
      // `observaciones` se copia tal cual, sin `|| null`: una cadena vacía llega
      // como cadena vacía. La asimetría es real y queda registrada.
      const f = mapear({ observaciones: '' });

      expect(f.observaciones).toBe('');
    });
  });

  describe('colecciones de respuestas', () => {
    it('devuelve listas vacías cuando la ficha no tiene respuestas', () => {
      const f = mapear();

      expect(f.respuestasDesempeno).toEqual([]);
      expect(f.respuestasAspecto).toEqual([]);
      expect(f.respuestasEjeItem).toEqual([]);
    });

    it('tolera que las colecciones lleguen ausentes', () => {
      // El `|| []` protege de un include incompleto: sin él, el frontend
      // recibiría `undefined` y fallaría al recorrer.
      const f = mapear({
        respuestasDesempeno: null,
        respuestasAspecto: undefined,
        respuestasEjeItem: null,
      });

      expect(f.respuestasDesempeno).toEqual([]);
      expect(f.respuestasAspecto).toEqual([]);
      expect(f.respuestasEjeItem).toEqual([]);
    });

    it('mapea las respuestas de desempeño con su pregunta extra', () => {
      const f = mapear({
        respuestasDesempeno: [
          {
            id: 'rd-1',
            fichaId: 'f-1',
            desempenoId: 'd-1',
            nivel: 3,
            observaciones: 'ok',
            preguntaExtraRespuesta: 'sí',
          },
        ],
      });

      expect(f.respuestasDesempeno[0]).toEqual({
        id: 'rd-1',
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 3,
        observaciones: 'ok',
        preguntaExtraRespuesta: 'sí',
      });
    });

    it('mapea las respuestas de eje con su evidencia', () => {
      const f = mapear({
        respuestasEjeItem: [
          {
            id: 're-1',
            fichaId: 'f-1',
            ejeItemId: 'e-1',
            nivel: 2,
            evidenciaUrl: 'https://ejemplo/foto.jpg',
            observacion: null,
          },
        ],
      });

      expect(f.respuestasEjeItem[0]).toEqual(
        expect.objectContaining({ evidenciaUrl: 'https://ejemplo/foto.jpg', nivel: 2 }),
      );
    });

    it('mapea las respuestas de aspecto como marcas', () => {
      const f = mapear({
        respuestasAspecto: [{ id: 'ra-1', fichaId: 'f-1', aspectoId: 'a-1', marcado: true }],
      });

      expect(f.respuestasAspecto[0]).toEqual({
        id: 'ra-1',
        fichaId: 'f-1',
        aspectoId: 'a-1',
        marcado: true,
      });
    });
  });
});

describe('mapContexto', () => {
  it('traslada los datos del aula tal cual', () => {
    const c = mapContexto(contexto());

    expect(c).toEqual({
      id: 'ctx-1',
      areaCurricular: 'Matemática',
      grado: '3',
      seccion: 'A',
      cantidadEstudiantes: 28,
      cantidadEstudiantesNee: 2,
      cursoId: 'curso-1',
    });
  });

  it('conserva el cero de estudiantes con necesidades especiales', () => {
    // Cero es un dato válido y distinto de «sin informar»; una conversión
    // descuidada con `||` lo convertiría en nulo.
    const c = mapContexto(contexto({ cantidadEstudiantesNee: 0 }));

    expect(c.cantidadEstudiantesNee).toBe(0);
  });
});
