import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, TableBody } from '@shared/ui/table';
import type { Docente } from '@entities/model-docentes';
import { FilaDeDocente } from './FilaDeDocente';

const docente = {
  id: 'd-1',
  dni: '12345678',
  nombres: 'Ana',
  apellidos: 'Quispe',
  correo: '',
  celular: '',
  condicion: 'Nombrado',
  escala: null,
  secciones: [],
  activo: true,
} as unknown as Docente;

const montar = (acciones: Partial<Parameters<typeof FilaDeDocente>[0]['acciones']>) =>
  render(
    <Table>
      <TableBody>
        <FilaDeDocente
          docente={docente}
          cargoFinalizado={false}
          acciones={{ onVer: vi.fn(), rotuloFinalizar: 'Desactivar', ...acciones }}
        />
      </TableBody>
    </Table>,
  );

describe('FilaDeDocente - restablecer contraseña', () => {
  it('muestra el boton y lo dispara cuando la accion existe', async () => {
    const onRestablecerContrasena = vi.fn();
    montar({ onRestablecerContrasena });

    await userEvent.click(screen.getByTitle('Restablecer contraseña'));

    expect(onRestablecerContrasena).toHaveBeenCalled();
  });

  it('no muestra el boton si la accion no se ofrece', () => {
    montar({});
    expect(screen.queryByTitle('Restablecer contraseña')).not.toBeInTheDocument();
  });
});
