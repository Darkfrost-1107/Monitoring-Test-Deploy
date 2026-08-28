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
});
