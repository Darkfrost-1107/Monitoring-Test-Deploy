import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContextoDeAula } from '../../lib/estado-formulario';
import { ContextoDeAulaSeccion } from './ContextoDeAulaSeccion';

/**
 * Al terminar de cargar Área, Grado y Sección, el bloque se pliega solo al
 * salir de él, para dejarle más lugar a los criterios. Tabular o hacer clic
 * entre esos mismos campos no debe plegarlo a mitad de carga.
 */

const contexto = (over: Partial<ContextoDeAula> = {}): ContextoDeAula => ({
  area: '',
  grado: '',
  seccion: '',
  alumnos: '',
  alumnosNee: '',
  ...over,
});

const SIN_SUGERENCIAS = { areas: [], secciones: [] };

describe('ContextoDeAulaSeccion — plegado automático', () => {
  it('se pliega solo al salir del bloque con los tres campos completos', () => {
    render(
      <ContextoDeAulaSeccion
        contexto={contexto({ area: 'Comunicación', grado: '2°', seccion: 'A' })}
        onCambiar={vi.fn()}
        sugerencias={SIN_SUGERENCIAS}
        soloLectura={false}
      />,
    );

    fireEvent.blur(screen.getByPlaceholderText('Ej. A'), { relatedTarget: document.body });

    expect(screen.getByText('Contexto de Aula:')).toBeInTheDocument();
  });

  it('no se pliega si falta un campo obligatorio', () => {
    render(
      <ContextoDeAulaSeccion
        contexto={contexto({ area: 'Comunicación', grado: '2°', seccion: '' })}
        onCambiar={vi.fn()}
        sugerencias={SIN_SUGERENCIAS}
        soloLectura={false}
      />,
    );

    fireEvent.blur(screen.getByPlaceholderText('Ej. A'), { relatedTarget: document.body });

    expect(screen.queryByText('Contexto de Aula:')).not.toBeInTheDocument();
  });

  it('tabular entre los propios campos no lo pliega a mitad de carga', () => {
    render(
      <ContextoDeAulaSeccion
        contexto={contexto({ area: 'Comunicación', grado: '2°', seccion: 'A' })}
        onCambiar={vi.fn()}
        sugerencias={SIN_SUGERENCIAS}
        soloLectura={false}
      />,
    );

    fireEvent.blur(screen.getByPlaceholderText('Ej. Comunicación'), {
      relatedTarget: screen.getByPlaceholderText('Ej. 2°'),
    });

    expect(screen.queryByText('Contexto de Aula:')).not.toBeInTheDocument();
  });

  it('el botón «Plegar» manual sigue funcionando aunque falte un dato', async () => {
    const user = userEvent.setup();
    render(
      <ContextoDeAulaSeccion
        contexto={contexto()}
        onCambiar={vi.fn()}
        sugerencias={SIN_SUGERENCIAS}
        soloLectura={false}
      />,
    );

    await user.click(screen.getByText('Plegar'));

    expect(screen.getByText('Contexto de Aula:')).toBeInTheDocument();
  });

  it('una ficha en modo lectura no ofrece plegar: sólo muestra el resumen', () => {
    render(
      <ContextoDeAulaSeccion
        contexto={contexto({ area: 'Comunicación', grado: '2°', seccion: 'A' })}
        onCambiar={vi.fn()}
        sugerencias={SIN_SUGERENCIAS}
        soloLectura
      />,
    );

    expect(screen.queryByText('Plegar')).not.toBeInTheDocument();
    expect(screen.getByText('Comunicación')).toBeInTheDocument();
  });
});
