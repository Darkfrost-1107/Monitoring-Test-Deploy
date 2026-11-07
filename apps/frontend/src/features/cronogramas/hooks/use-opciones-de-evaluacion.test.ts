import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Docente } from '@entities/model-docentes';
import { useOpcionesDeEvaluacion } from './use-opciones-de-evaluacion';

/**
 * A quién puede evaluar cada persona al programar una visita.
 *
 * Este hook no tenía pruebas, y el defecto que las trae es exactamente el que
 * eso permite: en una I.E. de Secundaria, el selector de docente aparecía vacío
 * para el coordinador pedagógico aunque tuviera nueve docentes asignados.
 *
 * ── Las dos reglas, que son distintas ──
 * El especialista de UGEL monitorea por ÁREA: en Secundaria sólo ve a los
 * docentes cuya especialidad maneja. El coordinador y el jefe de taller se
 * rigen por su CARTERA: los docentes que les asignaron.
 *
 * Aplicarle la regla del área al personal de la institución los dejaba sin
 * nadie, porque no tienen registro de especialista y su lista de áreas llega
 * vacía — y en Secundaria una lista vacía descarta a todos.
 */

const IE = 'ie-secundaria';

const docente = (over: Partial<Docente> = {}): Docente =>
  ({
    id: 'doc-1',
    personaId: 'per-1',
    nombres: 'Bertha',
    apellidos: 'Condori',
    institucionId: IE,
    activo: true,
    cargo: 'Docente de Aula',
    especialidad: 'CTA',
    ...over,
  }) as Docente;

const instituciones = [{ id: IE, nombre: 'José Carlos Mariátegui', nivelEducativo: 'Secundaria' }];

const parametros = (over: Record<string, unknown> = {}) => ({
  docentes: [] as readonly Docente[],
  instituciones,
  especialistas: [] as readonly { id: string; personaId: string }[],
  esDirector: true,
  institucionDelUsuarioId: IE,
  institucionElegidaId: IE,
  tipoDeVisita: 'DOCENTE' as const,
  evaluadorElegidoId: '',
  evaluadoElegidoId: '',
  ...over,
});

const nombresOfrecidos = (params: ReturnType<typeof parametros>) =>
  renderHook(() => useOpcionesDeEvaluacion(params)).result.current.evaluados.map((d) => d.nombres);

describe('useOpcionesDeEvaluacion — personal de la institución', () => {
  /** La coordinadora, con su cartera de docentes asignados. */
  const coordinadora = docente({
    id: 'doc-coord',
    personaId: 'per-coord',
    nombres: 'Rosminda',
    cargo: 'Coordinador Pedagógico',
    especialidad: undefined,
  });

  const asignada = docente({
    id: 'doc-asignada',
    personaId: 'per-asignada',
    nombres: 'Bertha',
    especialidad: 'CTA',
    evaluadorActual: { evaluadorId: 'doc-coord' },
  } as Partial<Docente>);

  const ajena = docente({
    id: 'doc-ajena',
    personaId: 'per-ajena',
    nombres: 'Marlene',
    especialidad: 'Matemática',
  });

  const especialistas = [{ id: 'esp-coord', personaId: 'per-coord' }];

  it('ofrece a los docentes de su cartera en una I.E. de Secundaria', () => {
    // El defecto original: la lista salía vacía. La coordinadora no tiene
    // registro de especialista, así que su lista de áreas llega vacía, y en
    // Secundaria eso descartaba a todos.
    const ofrecidos = nombresOfrecidos(
      parametros({
        docentes: [coordinadora, asignada, ajena],
        especialistas,
        evaluadorElegidoId: 'esp-coord',
        especialidadesDelEvaluador: [],
      }),
    );

    expect(ofrecidos).toEqual(['Bertha']);
  });

  it('no ofrece a los docentes que no le asignaron', () => {
    const ofrecidos = nombresOfrecidos(
      parametros({
        docentes: [coordinadora, asignada, ajena],
        especialistas,
        evaluadorElegidoId: 'esp-coord',
        especialidadesDelEvaluador: [],
      }),
    );

    expect(ofrecidos).not.toContain('Marlene');
  });

  it('el director evalúa a todo su personal, no a una cartera', () => {
    const director = docente({
      id: 'doc-dir',
      personaId: 'per-dir',
      nombres: 'Andrés',
      cargo: 'Director',
    });

    const ofrecidos = nombresOfrecidos(
      parametros({
        docentes: [director, asignada, ajena],
        especialistas: [{ id: 'esp-dir', personaId: 'per-dir' }],
        evaluadorElegidoId: 'esp-dir',
        especialidadesDelEvaluador: [],
      }),
    );

    // Y no se ofrece a sí mismo: su visita la programa la UGEL.
    expect(ofrecidos.sort()).toEqual(['Bertha', 'Marlene']);
  });

  it('el subdirector evalúa a todo el personal de la institución sin limitarse a una cartera y sin auto-evaluarse', () => {
    const subdirector = docente({
      id: 'doc-subdir',
      personaId: 'per-subdir',
      nombres: 'Carlos Subdirector',
      cargo: 'Subdirector',
    });

    const ofrecidos = nombresOfrecidos(
      parametros({
        docentes: [subdirector, asignada, ajena],
        especialistas: [{ id: 'esp-subdir', personaId: 'per-subdir' }],
        evaluadorElegidoId: 'esp-subdir',
        especialidadesDelEvaluador: [],
      }),
    );

    // Evalúa a todos los docentes de la I.E. y no a sí mismo
    expect(ofrecidos.sort()).toEqual(['Bertha', 'Marlene']);
  });

  it('el director puede evaluar al subdirector de la institución', () => {
    const director = docente({
      id: 'doc-dir',
      personaId: 'per-dir',
      nombres: 'Andrés',
      cargo: 'Director',
    });
    const subdirector = docente({
      id: 'doc-subdir',
      personaId: 'per-subdir',
      nombres: 'Carlos Subdirector',
      cargo: 'Subdirector',
    });

    const ofrecidos = nombresOfrecidos(
      parametros({
        docentes: [director, subdirector, asignada],
        especialistas: [{ id: 'esp-dir', personaId: 'per-dir' }],
        evaluadorElegidoId: 'esp-dir',
        especialidadesDelEvaluador: [],
      }),
    );

    // El director ve al subdirector y a los demás docentes
    expect(ofrecidos.sort()).toEqual(['Bertha', 'Carlos Subdirector']);
  });
});

describe('useOpcionesDeEvaluacion — especialista de UGEL', () => {
  /**
   * Para el especialista la regla del área SÍ corre: en Secundaria monitorea
   * únicamente a los docentes cuya especialidad maneja.
   */
  const params = (especialidades: string[]) =>
    parametros({
      esDirector: false,
      institucionDelUsuarioId: undefined,
      docentes: [
        docente({ id: 'a', nombres: 'Bertha', especialidad: 'CTA' }),
        docente({ id: 'b', nombres: 'Marlene', especialidad: 'Matemática' }),
      ],
      evaluadorElegidoId: 'esp-ugel',
      especialidadesDelEvaluador: especialidades,
    });

  it('sólo ofrece a los docentes de su área', () => {
    expect(nombresOfrecidos(params(['CTA']))).toEqual(['Bertha']);
  });

  it('sin áreas declaradas no ofrece a nadie, y eso es correcto para la UGEL', () => {
    // Un especialista sin área asignada no debería monitorear en Secundaria: es
    // un dato faltante en su registro, no una lista que haya que ignorar.
    expect(nombresOfrecidos(params([]))).toEqual([]);
  });

  it('ofrece a los docentes que comparten especialidad a través de sus especialidades extras', () => {
    const paramsConExtras = parametros({
      esDirector: false,
      institucionDelUsuarioId: undefined,
      docentes: [
        docente({ id: 'a', nombres: 'Bertha', especialidad: 'CTA' }),
        docente({
          id: 'c',
          nombres: 'Carlos',
          especialidad: 'Comunicación',
          especialidadesExtras: ['CTA'],
        }),
      ],
      evaluadorElegidoId: 'esp-ugel',
      especialidadesDelEvaluador: ['CTA'],
    });
    expect(nombresOfrecidos(paramsConExtras).sort()).toEqual(['Bertha', 'Carlos']);
  });

  it('el responsable de nivel (Jefe de Área) puede evaluar a todos los docentes de secundaria sin restricción de especialidad única', () => {
    const paramsJefeArea = parametros({
      esDirector: false,
      institucionDelUsuarioId: undefined,
      docentes: [
        docente({ id: 'a', nombres: 'Bertha', especialidad: 'CTA' }),
        docente({ id: 'b', nombres: 'Marlene', especialidad: 'Matemática' }),
      ],
      especialistas: [{ id: 'jefe-secundaria', personaId: 'per-jefe', cargo: 'Jefe de Área' }],
      evaluadorElegidoId: 'jefe-secundaria',
      especialidadesDelEvaluador: [],
    });
    expect(nombresOfrecidos(paramsJefeArea).sort()).toEqual(['Bertha', 'Marlene']);
  });

  describe('visitas de tipo DIRECTIVO', () => {
    const director = docente({
      id: 'dir-1',
      nombres: 'Hernán',
      apellidos: 'Pérez',
      cargo: 'Director',
      especialidad: 'Ciencias Sociales',
    });
    const docenteAula = docente({
      id: 'doc-1',
      nombres: 'Bertha',
      cargo: 'Docente de Aula',
      especialidad: 'CTA',
    });

    it('ofrece al director al especialista de UGEL aunque no compartan especialidad curricular', () => {
      const resultado = nombresOfrecidos(
        parametros({
          esDirector: false,
          institucionDelUsuarioId: undefined,
          docentes: [director, docenteAula],
          especialistas: [{ id: 'esp-cta', personaId: 'per-cta', cargo: 'Especialista' }],
          evaluadorElegidoId: 'esp-cta',
          especialidadesDelEvaluador: ['CTA'],
          tipoDeVisita: 'DIRECTIVO',
        }),
      );
      expect(resultado).toEqual(['Hernán']);
    });

    it('ofrece al director al Responsable de Nivel (Jefe de Área)', () => {
      const resultado = nombresOfrecidos(
        parametros({
          esDirector: false,
          institucionDelUsuarioId: undefined,
          docentes: [director, docenteAula],
          especialistas: [{ id: 'jefe-sec', personaId: 'per-sec', cargo: 'Jefe de Área' }],
          evaluadorElegidoId: 'jefe-sec',
          especialidadesDelEvaluador: [],
          tipoDeVisita: 'DIRECTIVO',
        }),
      );
      expect(resultado).toEqual(['Hernán']);
    });

    it('ofrece al director al Jefe de Gestión Pedagógica', () => {
      const resultado = nombresOfrecidos(
        parametros({
          esDirector: false,
          institucionDelUsuarioId: undefined,
          docentes: [director, docenteAula],
          especialistas: [{ id: 'jg-ugel', personaId: 'per-jg', cargo: 'Jefe de Gestión' }],
          evaluadorElegidoId: 'jg-ugel',
          especialidadesDelEvaluador: [],
          tipoDeVisita: 'DIRECTIVO',
        }),
      );
      expect(resultado).toEqual(['Hernán']);
    });
  });
});


