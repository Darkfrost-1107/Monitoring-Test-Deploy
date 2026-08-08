import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cronograma } from '@entities/model-cronogramas';
import type { Plantilla } from '@entities/model-plantillas';
import type { DatosFicha } from '../lib/ficha-estado';

/**
 * Pruebas del llenado y cierre de una ficha de monitoreo.
 *
 * Es la pantalla donde el evaluador pasa más tiempo, y la que decide si una
 * visita queda registrada. Lo que se fija acá es el cierre: que no se pueda
 * finalizar una ficha incompleta, y que el motivo se diga en pantalla en vez de
 * desaparecer.
 *
 * Las hojas pesadas se sustituyen porque son otros asuntos con sus propias
 * dependencias: `FichaPrintable` consulta la ficha del backend, `HistorialChart`
 * dibuja con una biblioteca de gráficos, y el docente evaluado se pide por API.
 */

vi.mock('@/widgets/reportes/ui/FichaPrintable', () => ({
  FichaPrintable: () => <div data-testid="ficha-imprimible" />,
}));

vi.mock('./HistorialChart', () => ({
  HistorialChart: () => <div data-testid="historial" />,
}));

vi.mock('../hooks/use-docente-evaluado', () => ({
  useDocenteEvaluado: () => ({ docente: null, areasSugeridas: [] }),
}));

vi.mock('react-to-print', () => ({ useReactToPrint: () => () => {} }));

const { LlenarFichaForm } = await import('./LlenarFichaForm');

const NIVELES: Plantilla['niveles'] = [
  { nivel: 'I', denominacion: 'Inicio', rangoMin: 1, color: '#ef4444' },
  { nivel: 'II', denominacion: 'En proceso', rangoMin: 2, color: '#f59e0b' },
  { nivel: 'III', denominacion: 'Logro esperado', rangoMin: 3, color: '#22c55e' },
  { nivel: 'IV', denominacion: 'Logro destacado', rangoMin: 4, color: '#0f766e' },
];

const desempeno = (id: string, nombre: string): Plantilla['desempenos'][number] => ({
  id,
  nombre,
  descripcionCorta: `Descripción de ${nombre}`,
  aspectos: [{ id: `${id}-a1`, descripcion: 'Aspecto observable' }],
  rubrica: NIVELES.map((n) => ({ nivel: n.nivel, descripcion: `Rúbrica ${n.nivel}` })),
});

const PLANTILLA: Plantilla = {
  id: 'pl-1',
  tipoMonitoreo: 'Monitoreo Docente',
  anioAcademico: 2026,
  baremo: 'Vigente',
  niveles: NIVELES,
  desempenos: [desempeno('d1', 'Involucra activamente a los estudiantes')],
  ejesItems: [],
  fechaCreacion: '2026-01-15',
  estado: 'Vigente',
  descripcion: 'Plantilla de prueba',
};

const VISITA: Cronograma = {
  id: 'v-1',
  fechaHora: '2026-09-01T08:00:00.000Z',
  especialista: 'Ana Torres',
  especialistaInitials: 'AT',
  institucion: 'IE 70001',
  docenteDirectivo: 'Rosa Mamani',
  tipo: 'DOCENTE',
  nroVisita: '01',
  estado: 'PROGRAMADO',
  modalidad: 'EBR',
  nivel: 'Primaria',
  monitorId: 'esp-1',
  evaluadoId: 'doc-1',
  institucionId: 'ie-1',
};

/** Ficha con todo lo que el cierre exige. */
const FICHA_COMPLETA: DatosFicha = {
  checkedAspects: { 'd1-a1': true },
  selectedLevels: { d1: 'III' },
  generalComments: 'Observaciones generales.',
  sugerencias: 'Reforzar el uso de material concreto.',
  compromisos: 'Aplicar la estrategia en la próxima sesión.',
  rubricComments: { d1: 'Se observó participación sostenida.' },
  preguntaExtraAnswers: {},
  respuestasEjeItem: {},
  evidenciaUrls: {},
  observacionesEjeItem: {},
} as DatosFicha;

const montar = (opciones: { initialState?: DatosFicha; visit?: Partial<Cronograma> } = {}) => {
  const onFinalize = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();

  render(
    <LlenarFichaForm
      isOpen
      onClose={onClose}
      visit={{ ...VISITA, ...opciones.visit }}
      template={PLANTILLA}
      onSave={onSave}
      onFinalize={onFinalize}
      initialState={opciones.initialState}
    />,
  );

  return { onFinalize, onSave, onClose };
};

const finalizar = () => userEvent.click(screen.getByRole('button', { name: /Finalizar/i }));

beforeEach(() => {
  localStorage.clear();
});

describe('LlenarFichaForm — cierre de una ficha incompleta', () => {
  /**
   * Antes esto era un `alert()`: había que descartarlo para ir a buscar lo que
   * faltaba, y al descartarlo el motivo desaparecía.
   */
  it('no finaliza una ficha vacía y dice qué falta', async () => {
    const { onFinalize } = montar();

    await finalizar();

    expect(onFinalize).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Faltan calificar niveles/i);
  });

  it('el motivo nombra el desempeño sin calificar', async () => {
    montar();
    await finalizar();

    expect(screen.getByRole('alert')).toHaveTextContent(/Involucra activamente/i);
  });

  it('el aviso se puede cerrar', async () => {
    montar();
    await finalizar();

    await userEvent.click(screen.getByRole('button', { name: /^Cerrar$/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sin sugerencias tampoco finaliza', async () => {
    const { onFinalize } = montar({
      initialState: { ...FICHA_COMPLETA, sugerencias: '' },
    });

    await finalizar();

    expect(onFinalize).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/sugerencias son obligatorias/i);
  });

  it('sin compromisos tampoco finaliza', async () => {
    const { onFinalize } = montar({
      initialState: { ...FICHA_COMPLETA, compromisos: '' },
    });

    await finalizar();

    expect(onFinalize).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/compromisos son obligatorios/i);
  });

  it('sin justificar el nivel tampoco finaliza', async () => {
    const { onFinalize } = montar({
      initialState: { ...FICHA_COMPLETA, rubricComments: {} },
    });

    await finalizar();

    expect(onFinalize).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Faltan justificaciones/i);
  });
});

describe('LlenarFichaForm — cierre de una ficha completa', () => {
  it('finaliza y avisa a quien la abrió, con la visita que corresponde', async () => {
    const { onFinalize } = montar({ initialState: FICHA_COMPLETA });

    await finalizar();

    expect(onFinalize).toHaveBeenCalledWith('v-1', expect.anything());
  });

  /**
   * El contexto de aula —área, grado, sección, número de estudiantes— sólo
   * tiene sentido en una visita a docente. Una visita directiva evalúa la
   * gestión, no una clase.
   */
  it('una visita a docente lleva el contexto de aula', async () => {
    const { onFinalize } = montar({ initialState: FICHA_COMPLETA });
    await finalizar();

    const [[, datos]] = onFinalize.mock.calls as [[string, DatosFicha]];
    expect(datos.contexto).toBeDefined();
  });

  it('una visita directiva no lo lleva', async () => {
    const { onFinalize } = montar({
      visit: { tipo: 'DIRECTIVO' },
      initialState: FICHA_COMPLETA,
    });
    await finalizar();

    const [[, datos]] = onFinalize.mock.calls as [[string, DatosFicha]];
    expect(datos.contexto).toBeUndefined();
  });

  it('no deja aviso de faltantes', async () => {
    montar({ initialState: FICHA_COMPLETA });
    await finalizar();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lleva el nivel registrado de cada desempeño', async () => {
    const { onFinalize } = montar({ initialState: FICHA_COMPLETA });
    await finalizar();

    const [[, datos]] = onFinalize.mock.calls as [[string, DatosFicha]];
    expect(datos.selectedLevels).toMatchObject({ d1: 'III' });
  });
});

describe('LlenarFichaForm — guardar borrador', () => {
  /**
   * El borrador no valida nada: su razón de ser es no perder lo escrito cuando
   * la ficha todavía está a medias.
   */
  it('guarda una ficha incompleta sin quejarse', async () => {
    const { onSave } = montar();

    await userEvent.click(screen.getByRole('button', { name: /Guardar como Borrador/i }));

    expect(onSave).toHaveBeenCalledWith('v-1', expect.anything());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LlenarFichaForm — ficha ya cerrada', () => {
  it('una visita completada no ofrece finalizar', () => {
    montar({ visit: { estado: 'COMPLETADO' }, initialState: FICHA_COMPLETA });

    expect(screen.queryByRole('button', { name: /Finalizar/i })).not.toBeInTheDocument();
  });
});

describe('LlenarFichaForm — carga inicial', () => {
  it('abre con el estado recibido', () => {
    montar({ initialState: FICHA_COMPLETA });

    expect(screen.getByDisplayValue('Reforzar el uso de material concreto.')).toBeInTheDocument();
  });

  /**
   * Sin estado recibido se lee el borrador local. Un borrador ilegible se
   * descarta: impedir abrir la ficha sería peor que perderlo.
   */
  it('un borrador ilegible no impide abrir la ficha', () => {
    localStorage.setItem('ficha_v-1', '{ esto no es json');

    expect(() => montar()).not.toThrow();
    expect(screen.getByRole('button', { name: /Finalizar/i })).toBeInTheDocument();
  });
});
