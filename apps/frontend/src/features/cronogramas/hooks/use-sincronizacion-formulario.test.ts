import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSincronizacionFormulario } from './use-sincronizacion-formulario';

/**
 * Correcciones automáticas del formulario de programación.
 *
 * Acá se fija la que acota el tipo de visita según quién monitorea: el Jefe de
 * Gestión sólo levanta la ficha del director, así que si se lo elige con
 * «Docente» marcado, el formulario pasa solo a «Director».
 */

type Params = Parameters<typeof useSincronizacionFormulario>[0];

const montar = (over: Partial<Params> = {}) => {
  const onCambiar = vi.fn();
  renderHook(() =>
    useSincronizacionFormulario({
      esEdicion: false,
      evaluadorElegidoId: 'esp-1',
      evaluadoElegidoId: '',
      tipoDeVisita: 'DOCENTE',
      tiposPermitidos: ['DOCENTE', 'DIRECTIVO'],
      evaluadosDisponibles: [],
      evaluadoResuelto: null,
      cronogramas: [],
      onCambiar,
      ...over,
    }),
  );
  return onCambiar;
};

describe('useSincronizacionFormulario — tipo de visita según el monitor', () => {
  it('pasa a «Director» si el monitor sólo levanta esa ficha y estaba «Docente»', () => {
    const onCambiar = montar({ tiposPermitidos: ['DIRECTIVO'], tipoDeVisita: 'DOCENTE' });

    expect(onCambiar).toHaveBeenCalledWith('tipo', 'DIRECTIVO');
  });

  it('no toca nada si el tipo elegido ya es el permitido', () => {
    const onCambiar = montar({ tiposPermitidos: ['DIRECTIVO'], tipoDeVisita: 'DIRECTIVO' });

    expect(onCambiar).not.toHaveBeenCalledWith('tipo', expect.anything());
  });

  it('no restringe a quien puede levantar las dos', () => {
    const onCambiar = montar({
      tiposPermitidos: ['DOCENTE', 'DIRECTIVO'],
      tipoDeVisita: 'DOCENTE',
    });

    expect(onCambiar).not.toHaveBeenCalledWith('tipo', expect.anything());
  });

  /** Una visita ya emitida no se corrige sola: se respeta lo que quedó guardado. */
  it('al editar no corrige el tipo', () => {
    const onCambiar = montar({
      esEdicion: true,
      tiposPermitidos: ['DIRECTIVO'],
      tipoDeVisita: 'DOCENTE',
    });

    expect(onCambiar).not.toHaveBeenCalledWith('tipo', expect.anything());
  });
});

describe('useSincronizacionFormulario — número de visita sugerido', () => {
  const evaluado = { id: 'ana' } as Params['evaluadoResuelto'];
  const previa = (tipo: string, nroVisita: string) =>
    ({ evaluadoId: 'ana', tipo, nroVisita, estado: 'COMPLETADO' }) as Params['cronogramas'][number];

  /** El backend cuenta las visitas del evaluado sin mirar el tipo: sugerir el 01 chocaría. */
  it('cuenta las visitas previas aunque hayan sido de otro tipo de ficha', () => {
    const onCambiar = montar({
      evaluadoResuelto: evaluado,
      tipoDeVisita: 'DIRECTIVO',
      cronogramas: [previa('DOCENTE', '01')],
    });

    expect(onCambiar).toHaveBeenCalledWith('visita', '02');
  });
});
