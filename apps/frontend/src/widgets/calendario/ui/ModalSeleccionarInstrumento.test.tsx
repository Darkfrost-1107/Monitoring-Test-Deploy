import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Plantilla } from '@entities/model-plantillas';
import type { Cronograma } from '@entities/model-cronogramas';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';
import { ModalSeleccionarInstrumento } from './ModalSeleccionarInstrumento';

/**
 * El modal deja consultar las fichas de una visita y, a quien es su monitor,
 * llenar las que faltan. Lo que se fija acá es la barrera: quien NO es el monitor
 * (p. ej. un jefe de gestión que sólo supervisa) puede ver las finalizadas pero
 * no abrir a evaluar una ficha sin llenar —se le muestra "Ficha no llenada"—.
 */

const VISITA = {
  id: 'v-1',
  institucion: 'IE 70001',
  docenteDirectivo: 'Rosa Mamani',
  tipo: 'DOCENTE',
} as unknown as Cronograma;

const plantilla = (id: string, instrumento: string, tipoMonitoreo: string): Plantilla =>
  ({
    id,
    instrumento,
    tipoMonitoreo,
    anioAcademico: 2026,
    baremo: 'Vigente',
    desempenos: [{}, {}, {}],
  }) as unknown as Plantilla;

const REGULAR = plantilla('p-regular', 'DOCENTE', 'Monitoreo Docente');
const EIB = plantilla('p-eib', 'DOCENTE_EIB', 'Monitoreo Docente EIB');

const FICHA_FINALIZADA = {
  plantillaId: 'p-regular',
  estado: 'FINALIZADO',
  nivelLogro: 'INICIO',
} as unknown as IFichaMonitoreo;

const montar = (puedeLlenar: boolean) => {
  const onSeleccionar = vi.fn();
  render(
    <ModalSeleccionarInstrumento
      isOpen
      onClose={vi.fn()}
      visita={VISITA}
      plantillas={[REGULAR, EIB]}
      fichasExistentes={[FICHA_FINALIZADA]}
      onSeleccionar={onSeleccionar}
      puedeLlenar={puedeLlenar}
    />,
  );
  return { onSeleccionar };
};

describe('ModalSeleccionarInstrumento — barrera de llenado', () => {
  it('quien no es monitor no puede abrir a evaluar la ficha sin llenar', async () => {
    const { onSeleccionar } = montar(false);

    // La EIB no está finalizada: se rotula "Ficha no llenada" y no se puede abrir.
    const noLlenada = screen.getByText('Ficha no llenada');
    expect(noLlenada).toBeInTheDocument();

    const tarjetaEib = screen.getByText(/Monitoreo Docente EIB/i).closest('[aria-disabled]');
    expect(tarjetaEib).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(noLlenada);
    expect(onSeleccionar).not.toHaveBeenCalled();
  });

  it('quien no es monitor sí puede consultar la ficha finalizada', async () => {
    const { onSeleccionar } = montar(false);

    const verImprimir = screen.getByText('Ver / Imprimir');
    await userEvent.click(verImprimir);

    expect(onSeleccionar).toHaveBeenCalledWith(REGULAR, FICHA_FINALIZADA);
  });

  it('el monitor sí puede abrir a evaluar la ficha sin llenar', async () => {
    const { onSeleccionar } = montar(true);

    expect(screen.queryByText('Ficha no llenada')).not.toBeInTheDocument();

    // La EIB sin ficha se ofrece como complementaria y sí se puede abrir.
    const aplicar = screen.getByText('Aplicar Complementaria');
    await userEvent.click(aplicar);

    expect(onSeleccionar).toHaveBeenCalledWith(EIB, undefined);
  });
});
