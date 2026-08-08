import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { AccionesVisita, type SituacionEvaluador } from './AccionesVisita';

/**
 * Pruebas de las acciones sobre la visita seleccionada en el calendario.
 *
 * Lo que se fija acá es que ningún botón quede inerte: la ficha sólo se abre si
 * hay un instrumento aplicable, y hasta ahora eso no se miraba —el botón se
 * ofrecía igual y al pulsarlo no pasaba nada.
 */

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

const EVALUADOR: SituacionEvaluador = {
  puedeEvaluar: true,
  esMonitorCampo: true,
  esFechaCoincidente: true,
};

const montar = (
  opciones: {
    visita?: Partial<Cronograma>;
    evaluador?: Partial<SituacionEvaluador>;
    solicitud?: SolicitudReprogramacion | null;
    instrumentoNoDisponible?: string | null;
  } = {},
) => {
  const onIniciarFicha = vi.fn();
  const onVerFichaLlena = vi.fn();
  const onSolicitarReprogramacion = vi.fn();
  const onVerSolicitud = vi.fn();

  render(
    <AccionesVisita
      visita={{ ...VISITA, ...opciones.visita }}
      solicitud={opciones.solicitud ?? null}
      evaluador={{ ...EVALUADOR, ...opciones.evaluador }}
      instrumentoNoDisponible={opciones.instrumentoNoDisponible ?? null}
      onIniciarFicha={onIniciarFicha}
      onVerFichaLlena={onVerFichaLlena}
      onSolicitarReprogramacion={onSolicitarReprogramacion}
      onVerSolicitud={onVerSolicitud}
    />,
  );

  return { onIniciarFicha, onVerFichaLlena, onSolicitarReprogramacion, onVerSolicitud };
};

const botonIniciar = () => screen.getByRole('button', { name: /Monitoreo/i });

describe('AccionesVisita — sin instrumento aplicable', () => {
  /**
   * La ficha sólo se monta si hay plantilla activa. Sin ella el botón seguía
   * habilitado, la pulsación abría un modal que no existía y no pasaba
   * absolutamente nada: ni error, ni aviso, ni segunda oportunidad.
   */
  it('no ofrece iniciar el monitoreo', () => {
    montar({ instrumentoNoDisponible: 'Cargando el instrumento…' });

    expect(botonIniciar()).toBeDisabled();
  });

  it('dice por qué no se puede', () => {
    montar({ instrumentoNoDisponible: 'No hay una plantilla vigente para este tipo de visita.' });

    expect(screen.getByText(/No hay una plantilla vigente/i)).toBeInTheDocument();
  });

  it('tampoco deja abrir la ficha llena de una visita completada', () => {
    montar({
      visita: { estado: 'COMPLETADO' },
      instrumentoNoDisponible: 'No se pudo cargar el instrumento.',
    });

    expect(screen.getByRole('button', { name: /Ver Ficha de Monitoreo Llena/i })).toBeDisabled();
  });

  /** Reprogramar no depende del instrumento: se sigue pudiendo pedir. */
  it('la reprogramación se sigue pudiendo solicitar', async () => {
    const { onSolicitarReprogramacion } = montar({
      instrumentoNoDisponible: 'Cargando el instrumento…',
    });

    await userEvent.click(screen.getByRole('button', { name: /Reprogramar/i }));
    expect(onSolicitarReprogramacion).toHaveBeenCalled();
  });
});

describe('AccionesVisita — con instrumento disponible', () => {
  it('inicia el monitoreo', async () => {
    const { onIniciarFicha } = montar();

    await userEvent.click(botonIniciar());
    expect(onIniciarFicha).toHaveBeenCalled();
  });

  it('una visita ya iniciada se continúa', () => {
    montar({ visita: { estado: 'EN_PROCESO' } });

    expect(screen.getByRole('button', { name: /Continuar Monitoreo/i })).toBeInTheDocument();
  });

  it('abre la ficha llena de una visita completada', async () => {
    const { onVerFichaLlena } = montar({ visita: { estado: 'COMPLETADO' } });

    await userEvent.click(screen.getByRole('button', { name: /Ver Ficha de Monitoreo Llena/i }));
    expect(onVerFichaLlena).toHaveBeenCalled();
  });
});

describe('AccionesVisita — restricción de fecha', () => {
  it('fuera del día programado no se inicia, y se dice cuál es', () => {
    montar({ evaluador: { esFechaCoincidente: false } });

    expect(botonIniciar()).toBeDisabled();
    expect(screen.getByText(/Restricción de Fecha/i)).toBeInTheDocument();
  });

  /** Una visita ya en proceso se continúa cualquier día: la fecha ya se cumplió. */
  it('una visita en proceso no queda atada a la fecha', () => {
    montar({ visita: { estado: 'EN_PROCESO' }, evaluador: { esFechaCoincidente: false } });

    expect(botonIniciar()).toBeEnabled();
  });
});

describe('AccionesVisita — quien no es la persona asignada', () => {
  it('no ve el botón de iniciar', () => {
    montar({ evaluador: { puedeEvaluar: false } });

    expect(screen.queryByRole('button', { name: /Monitoreo/i })).not.toBeInTheDocument();
  });

  it('se le dice quién sí puede', () => {
    montar({ evaluador: { puedeEvaluar: false } });

    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
  });
});
