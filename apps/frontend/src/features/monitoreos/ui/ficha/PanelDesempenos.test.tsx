import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Plantilla } from '@/entities/model-plantillas';
import {
  PanelDesempenos,
  type PlanificacionDeFicha,
  type RespuestasDesempenos,
} from './PanelDesempenos';

/**
 * El avance de la ficha es lineal: no se pasa al criterio siguiente, ni al
 * cierre, con el criterio actual a medias. Completo es lo mismo que exige el
 * cierre de la ficha: nivel elegido y justificación escrita.
 */

const NIVELES: Plantilla['niveles'] = [
  { nivel: 'I', denominacion: 'Inicio', rangoMin: 1, color: '#ef4444' },
  { nivel: 'II', denominacion: 'En proceso', rangoMin: 2, color: '#f59e0b' },
  { nivel: 'III', denominacion: 'Logro esperado', rangoMin: 3, color: '#22c55e' },
  { nivel: 'IV', denominacion: 'Logro destacado', rangoMin: 4, color: '#0f766e' },
];

const desempeno = (
  id: string,
  nombre: string,
  preguntaExtra?: string,
): Plantilla['desempenos'][number] => ({
  id,
  nombre,
  preguntaExtra,
  descripcionCorta: `Descripción de ${nombre}`,
  aspectos: [],
  rubrica: NIVELES.map((n) => ({ nivel: n.nivel, descripcion: `Rúbrica ${n.nivel}` })),
});

const PLANTILLA: Plantilla = {
  id: 'pl-1',
  tipoMonitoreo: 'Monitoreo Directivo',
  instrumento: 'DIRECTIVO',
  anioAcademico: 2026,
  lema: null,
  baremo: 'Vigente',
  niveles: NIVELES,
  desempenos: [desempeno('d1', 'Criterio uno'), desempeno('d2', 'Criterio dos')],
  ejesItems: [],
  fechaCreacion: '2026-01-15',
  fechaActualizacion: '2026-01-15',
  version: 1,
  estado: 'Vigente',
  descripcion: 'Plantilla de prueba',
};

/**
 * La ficha scrollea dentro de un único contenedor interno. Este contenedor de
 * prueba hace visible cada vez que alguien le fija `scrollTop`.
 */
const fijarScrollTop = vi.fn();
const Scroller = ({ children }: { children: ReactNode }) => (
  <div
    style={{ overflowY: 'auto' }}
    ref={(el) => {
      if (el)
        Object.defineProperty(el, 'scrollTop', {
          configurable: true,
          get: () => 300,
          set: fijarScrollTop,
        });
    }}
  >
    {children}
  </div>
);

beforeEach(() => fijarScrollTop.mockClear());

const VACIAS: RespuestasDesempenos = { niveles: {}, preguntasExtra: {}, observaciones: {} };

const montar = (
  respuestas: RespuestasDesempenos = VACIAS,
  soloLectura = false,
  planificacion?: PlanificacionDeFicha,
  template: Plantilla = PLANTILLA,
) =>
  render(
    <PanelDesempenos
      template={template}
      planificacion={planificacion}
      respuestas={respuestas}
      onElegirNivel={vi.fn()}
      onResponderExtra={vi.fn()}
      onObservar={vi.fn()}
      mostrarAspectos={false}
      soloLectura={soloLectura}
      cierre={{
        observaciones: '',
        sugerencias: '',
        compromisos: '',
        onObservaciones: vi.fn(),
        onSugerencias: vi.fn(),
        onCompromisos: vi.fn(),
        evidencias: {},
        onEvidencias: vi.fn(),
        onVerImagen: vi.fn(),
      }}
    />,
    { wrapper: Scroller },
  );

const siguiente = () => screen.getByRole('button', { name: /siguiente/i });
const itemDelIndice = (texto: string) => screen.getByText(texto).closest('[aria-disabled]');

describe('PanelDesempenos — avance bloqueado con el criterio incompleto', () => {
  it('no deja pasar al siguiente criterio si no se eligió el nivel', () => {
    montar({ niveles: {}, preguntasExtra: {}, observaciones: { d1: 'Justificado' } });

    expect(siguiente()).toBeDisabled();
  });

  it('no deja pasar si se eligió el nivel pero falta la justificación', () => {
    montar({ niveles: { d1: 'III' }, preguntasExtra: {}, observaciones: {} });

    expect(siguiente()).toBeDisabled();
  });

  it('deja pasar cuando el criterio tiene nivel y justificación', () => {
    montar({ niveles: { d1: 'III' }, preguntasExtra: {}, observaciones: { d1: 'Justificado' } });

    expect(siguiente()).toBeEnabled();
  });

  it('bloquea en el índice los criterios posteriores y el cierre', () => {
    montar();

    expect(itemDelIndice('Criterio dos')).toHaveAttribute('aria-disabled', 'true');
    expect(itemDelIndice('Observaciones Generales')).toHaveAttribute('aria-disabled', 'true');
  });

  it('un clic en un paso bloqueado no cambia de criterio', async () => {
    montar();

    await userEvent.click(screen.getByText('Criterio dos'));

    expect(screen.getByRole('heading', { name: 'Criterio uno' })).toBeInTheDocument();
  });

  it('desbloquea el criterio siguiente al completar el actual', () => {
    montar({ niveles: { d1: 'III' }, preguntasExtra: {}, observaciones: { d1: 'Justificado' } });

    expect(itemDelIndice('Criterio dos')).toHaveAttribute('aria-disabled', 'false');
    expect(itemDelIndice('Observaciones Generales')).toHaveAttribute('aria-disabled', 'true');
  });

  it('con todos los criterios completos se puede entrar al cierre', () => {
    montar({
      niveles: { d1: 'III', d2: 'IV' },
      preguntasExtra: {},
      observaciones: { d1: 'Uno', d2: 'Dos' },
    });

    expect(itemDelIndice('Observaciones Generales')).toHaveAttribute('aria-disabled', 'false');
  });

  it('en sólo lectura no bloquea nada: es una consulta', () => {
    montar(VACIAS, true);

    expect(siguiente()).toBeEnabled();
    expect(itemDelIndice('Criterio dos')).toHaveAttribute('aria-disabled', 'false');
  });

  it('marca como completado sólo el criterio con nivel y justificación', () => {
    montar({ niveles: { d1: 'III' }, preguntasExtra: {}, observaciones: {} });

    expect(screen.queryByText('Completado')).not.toBeInTheDocument();
  });
});

describe('PanelDesempenos — planificación y diseño de la evaluación como paso', () => {
  const COMPLETOS: RespuestasDesempenos = {
    niveles: { d1: 'III', d2: 'IV' },
    preguntasExtra: {},
    observaciones: { d1: 'Uno', d2: 'Dos' },
  };

  const planificacion = (over: Partial<PlanificacionDeFicha> = {}): PlanificacionDeFicha => ({
    items: [
      { id: 'e1', numero: 1, descripcion: 'Planifica el proceso de enseñanza' },
      { id: 'e2', numero: 2, descripcion: 'Diseña una evaluación pertinente' },
    ],
    niveles: NIVELES,
    respuestas: {},
    observaciones: {},
    onResponder: vi.fn(),
    onObservar: vi.fn(),
    ...over,
  });

  const ETIQUETA = 'Planificación y diseño de evaluación';

  it('aparece en la barra lateral entre los criterios y el cierre', () => {
    montar(COMPLETOS, false, planificacion());

    const plan = screen.getByText(ETIQUETA);
    const criterio = screen.getByText('Criterio dos');
    const cierre = screen.getByText('Observaciones Generales');

    expect(criterio.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plan.compareDocumentPosition(cierre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('no aparece si la ficha no la lleva', () => {
    montar(COMPLETOS);

    expect(screen.queryByText(ETIQUETA)).not.toBeInTheDocument();
  });

  it('queda bloqueada mientras haya un criterio incompleto', () => {
    montar(VACIAS, false, planificacion());

    expect(itemDelIndice(ETIQUETA)).toHaveAttribute('aria-disabled', 'true');
  });

  it('con los criterios completos se abre y se muestra en el panel derecho', async () => {
    montar(COMPLETOS, false, planificacion());

    await userEvent.click(screen.getByText(ETIQUETA));

    expect(screen.getByText('Planifica el proceso de enseñanza')).toBeInTheDocument();
    expect(screen.getByText('Diseña una evaluación pertinente')).toBeInTheDocument();
  });

  it('«Siguiente» desde el último criterio lleva a la planificación, no al cierre', async () => {
    montar(COMPLETOS, false, planificacion());

    await userEvent.click(screen.getByText('Criterio dos'));
    await userEvent.click(siguiente());

    expect(screen.getByText('Planifica el proceso de enseñanza')).toBeInTheDocument();
    expect(screen.queryByText(/Describa cómo se desarrolló la visita/)).not.toBeInTheDocument();
  });

  it('el cierre sigue bloqueado hasta completar la planificación', () => {
    montar(COMPLETOS, false, planificacion());

    expect(itemDelIndice('Observaciones Generales')).toHaveAttribute('aria-disabled', 'true');
  });

  it('con la planificación completa se abre el cierre', () => {
    montar(
      COMPLETOS,
      false,
      planificacion({ respuestas: { e1: 3, e2: 4 }, observaciones: { e1: 'A', e2: 'B' } }),
    );

    expect(itemDelIndice('Observaciones Generales')).toHaveAttribute('aria-disabled', 'false');
  });

  it('en sólo lectura no bloquea la planificación', () => {
    montar(VACIAS, true, planificacion());

    expect(itemDelIndice(ETIQUETA)).toHaveAttribute('aria-disabled', 'false');
  });
});

describe('PanelDesempenos — al cambiar de paso se vuelve al inicio de la ficha', () => {
  const COMPLETOS: RespuestasDesempenos = {
    niveles: { d1: 'III', d2: 'IV' },
    preguntasExtra: {},
    observaciones: { d1: 'Uno', d2: 'Dos' },
  };

  it('no mueve el scroll al abrir la ficha', () => {
    montar(COMPLETOS);

    expect(fijarScrollTop).not.toHaveBeenCalled();
  });

  it('«Siguiente» lleva el scroll al inicio, para ver el criterio que toca evaluar', async () => {
    montar(COMPLETOS);

    await userEvent.click(siguiente());

    expect(fijarScrollTop).toHaveBeenCalledWith(0);
  });

  it('«Anterior» también vuelve al inicio', async () => {
    montar(COMPLETOS);
    await userEvent.click(siguiente());
    fijarScrollTop.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /anterior/i }));

    expect(fijarScrollTop).toHaveBeenCalledWith(0);
  });

  it('elegir un criterio desde la barra lateral vuelve al inicio', async () => {
    montar(COMPLETOS);

    await userEvent.click(screen.getByText('Criterio dos'));

    expect(fijarScrollTop).toHaveBeenCalledWith(0);
  });

  it('un clic en un paso bloqueado no mueve el scroll', async () => {
    montar(VACIAS);

    await userEvent.click(screen.getByText('Criterio dos'));

    expect(fijarScrollTop).not.toHaveBeenCalled();
  });
});

describe('PanelDesempenos — la pregunta extra Sí/No también hay que responderla', () => {
  const CON_PREGUNTA: Plantilla = {
    ...PLANTILLA,
    desempenos: [
      desempeno('d1', 'Criterio uno', 'Marque «Sí» si hubo maltrato.'),
      desempeno('d2', 'Criterio dos'),
    ],
  };
  const respondido = (preguntasExtra: Record<string, boolean>): RespuestasDesempenos => ({
    niveles: { d1: 'III' },
    preguntasExtra,
    observaciones: { d1: 'Justificado' },
  });

  it('con nivel y observación pero sin responder la pregunta, no deja avanzar', () => {
    montar(respondido({}), false, undefined, CON_PREGUNTA);

    expect(siguiente()).toBeDisabled();
  });

  it('responder «No» desbloquea el avance', () => {
    montar(respondido({ d1: false }), false, undefined, CON_PREGUNTA);

    expect(siguiente()).toBeEnabled();
  });

  it('bloquea los pasos siguientes mientras la pregunta esté sin responder', () => {
    montar(respondido({}), false, undefined, CON_PREGUNTA);

    expect(itemDelIndice('Criterio dos')).toHaveAttribute('aria-disabled', 'true');
  });

  it('no marca el criterio como completado sin la pregunta respondida', () => {
    montar(respondido({}), false, undefined, CON_PREGUNTA);

    expect(screen.queryByText('Completado')).not.toBeInTheDocument();
  });

  it('en sólo lectura no se exige', () => {
    montar(respondido({}), true, undefined, CON_PREGUNTA);

    expect(siguiente()).toBeEnabled();
  });
});
