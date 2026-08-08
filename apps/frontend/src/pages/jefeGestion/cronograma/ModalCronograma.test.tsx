import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FORMULARIO_CRONOGRAMA_VACIO } from '@features/cronogramas/lib/formulario';
import { ModalCronograma } from './ModalCronograma';
import type { OpcionesDelFormulario, PerfilDelFormulario } from './tipos-del-formulario';

/**
 * Pruebas del formulario de programación de visitas.
 *
 * Es el hueco que el PR #62 dejó declarado: cambió el guardado de punta a punta
 * —de nombres a identificadores— y su cobertura llegaba sólo hasta la lógica
 * pura. Lo que faltaba comprobar es que el modal ofrezca lo que corresponde a
 * cada perfil y devuelva el identificador, no la etiqueta.
 */

const OPCIONES: OpcionesDelFormulario = {
  modalidades: ['EBR', 'EBA'],
  niveles: ['Inicial', 'Primaria', 'Secundaria'],
  especialistas: [
    { value: 'esp-1', label: 'Ana Torres' },
    { value: 'esp-2', label: 'Luis Quispe' },
  ],
  // Dos homónimas, que es el caso que motivó el cambio a identificadores.
  instituciones: [
    { value: 'ie-palca', label: 'COORDINACION DE PRONOEI — Palca' },
    { value: 'ie-pucara', label: 'COORDINACION DE PRONOEI — Pucara' },
  ],
  evaluados: [{ value: 'doc-1', label: 'Rosa Mamani (Docente de Aula)' }],
  evaluadores: [{ value: 'esp-dir', label: 'Rosa Mamani (Director)' }],
  visitas: [],
};

const PERFIL_UGEL: PerfilDelFormulario = {
  esDirector: false,
  esSecundaria: false,
  esCoordinadorOTaller: false,
};

interface Escenario {
  form?: Partial<typeof FORMULARIO_CRONOGRAMA_VACIO>;
  perfil?: Partial<PerfilDelFormulario>;
  opciones?: Partial<OpcionesDelFormulario>;
  esEdicion?: boolean;
  error?: string | null;
}

const montar = ({ form, perfil, opciones, esEdicion = false, error = null }: Escenario = {}) => {
  const onCambiar = vi.fn();
  const onEnviar = vi.fn((e: React.FormEvent) => e.preventDefault());
  const onCerrar = vi.fn();

  render(
    <ModalCronograma
      form={{ ...FORMULARIO_CRONOGRAMA_VACIO, ...form }}
      onCambiar={onCambiar}
      opciones={{ ...OPCIONES, ...opciones }}
      perfil={{ ...PERFIL_UGEL, ...perfil }}
      esEdicion={esEdicion}
      envio={{ error, enviando: false }}
      onEnviar={onEnviar}
      onCerrar={onCerrar}
    />,
  );

  return { onCambiar, onEnviar, onCerrar };
};

/** Abre un selector de Radix y devuelve sus opciones visibles. */
const abrirSelector = async (nombreAccesible: RegExp) => {
  await userEvent.click(screen.getByRole('combobox', { name: nombreAccesible }));
  return screen.getAllByRole('option');
};

describe('ModalCronograma — la cascada', () => {
  it('sin modalidad ni nivel avisa que hay que elegirlos primero', () => {
    montar();

    expect(
      screen.getByText(/Seleccione modalidad y nivel educativo para habilitar/i),
    ).toBeInTheDocument();
  });

  it('con la cascada completa el aviso desaparece', () => {
    montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    expect(screen.queryByText(/para habilitar la selección/i)).not.toBeInTheDocument();
  });

  it('informa cuántas instituciones quedaron para la cascada elegida', () => {
    montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    expect(screen.getByText(/2 institución\(es\) de EBR - Primaria/)).toBeInTheDocument();
  });
});

describe('ModalCronograma — identificadores, no nombres', () => {
  /**
   * En la base hay tres nombres de institución repetidos, uno cinco veces. El
   * selector guardaba el nombre y al guardar se buscaba por cadena, de modo que
   * siempre se elegía la primera. Ahora cada opción vale su identificador.
   */
  it('al elegir una institución homónima devuelve su identificador', async () => {
    const { onCambiar } = montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    const opciones = await abrirSelector(/Institución Educativa/i);
    await userEvent.click(opciones[1]);

    expect(onCambiar).toHaveBeenCalledWith('institucionId', 'ie-pucara');
  });

  it('las homónimas se distinguen por su etiqueta', async () => {
    montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    const opciones = await abrirSelector(/Institución Educativa/i);
    const etiquetas = opciones.map((o) => o.textContent);

    expect(new Set(etiquetas).size).toBe(2);
    expect(etiquetas[0]).toMatch(/Palca/);
    expect(etiquetas[1]).toMatch(/Pucara/);
  });

  it('al elegir un especialista devuelve su identificador', async () => {
    const { onCambiar } = montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    const opciones = await abrirSelector(/Especialista/i);
    await userEvent.click(opciones[0]);

    expect(onCambiar).toHaveBeenCalledWith('monitorId', 'esp-1');
  });
});

describe('ModalCronograma — qué ve cada perfil', () => {
  /**
   * El director trabaja sobre un solo colegio: no elige modalidad, nivel ni
   * institución. Se los muestra como campos fijos.
   */
  it('el director no elige modalidad ni institución', () => {
    montar({
      perfil: { esDirector: true },
      form: { institucionId: 'ie-palca', modalidad: 'EBR', nivel: 'Primaria' },
    });

    expect(screen.queryByRole('combobox', { name: /Modalidad/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /Institución Educativa \(filtro\)/i }),
    ).not.toBeInTheDocument();
  });

  it('el director ve el nombre de su institución, no su identificador', () => {
    montar({ perfil: { esDirector: true }, form: { institucionId: 'ie-palca' } });

    expect(screen.getByText('COORDINACION DE PRONOEI — Palca')).toBeInTheDocument();
    expect(screen.queryByText('ie-palca')).not.toBeInTheDocument();
  });

  /**
   * Fuera de Secundaria el director es el único evaluador posible, así que no
   * hay nada que elegir.
   */
  it('fuera de Secundaria el evaluador es un campo fijo', () => {
    montar({ perfil: { esDirector: true }, form: { monitorId: 'esp-dir' } });

    expect(screen.queryByRole('combobox', { name: /Evaluador/i })).not.toBeInTheDocument();
    expect(screen.getByText('Rosa Mamani (Director)')).toBeInTheDocument();
  });

  it('en Secundaria el director sí elige evaluador', () => {
    montar({ perfil: { esDirector: true, esSecundaria: true } });

    expect(screen.getByRole('combobox', { name: /Evaluador/i })).toBeInTheDocument();
  });

  /**
   * El coordinador y el jefe de taller se evalúan a sí mismos: ven el selector
   * pero no lo pueden cambiar.
   */
  it('el coordinador no puede cambiar de evaluador', () => {
    montar({ perfil: { esDirector: true, esSecundaria: true, esCoordinadorOTaller: true } });

    expect(screen.getByRole('combobox', { name: /Evaluador/i })).toBeDisabled();
  });

  it('el director no elige tipo de monitoreo', () => {
    montar({ perfil: { esDirector: true } });

    expect(screen.queryByRole('button', { name: 'Directivo' })).not.toBeInTheDocument();
  });
});

describe('ModalCronograma — evaluado', () => {
  it('sin institución elegida no se puede elegir evaluado', () => {
    montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    expect(screen.getByRole('combobox', { name: /a Evaluar/i })).toBeDisabled();
  });

  it('dice por qué está deshabilitado', () => {
    montar({ form: { modalidad: 'EBR', nivel: 'Primaria' } });

    expect(screen.getByText(/Seleccione institución primero/i)).toBeInTheDocument();
  });

  it('con institución elegida se habilita', () => {
    montar({ form: { modalidad: 'EBR', nivel: 'Primaria', institucionId: 'ie-palca' } });

    expect(screen.getByRole('combobox', { name: /a Evaluar/i })).toBeEnabled();
  });

  it('avisa cuando la institución no tiene a quién evaluar', () => {
    montar({
      form: { modalidad: 'EBR', nivel: 'Primaria', institucionId: 'ie-palca' },
      opciones: { evaluados: [] },
    });

    expect(screen.getByText(/No hay docentes para esta institución/i)).toBeInTheDocument();
  });
});

describe('ModalCronograma — edición', () => {
  /**
   * La fecha de una visita emitida se cambia por solicitud de reprogramación,
   * no editando el cronograma.
   */
  it('la fecha no se edita, y se dice por dónde cambiarla', () => {
    montar({ esEdicion: true });

    expect(screen.getByLabelText(/Fecha y Hora Programada/i)).toBeDisabled();
    expect(screen.getByText(/use Solicitud de Reprogramación/i)).toBeInTheDocument();
  });

  it('el estado de la visita sólo aparece al editar', () => {
    montar({ esEdicion: true });
    expect(screen.getByRole('combobox', { name: /Estado de Visita/i })).toBeInTheDocument();
  });

  it('al registrar no hay estado que elegir', () => {
    montar();
    expect(screen.queryByRole('combobox', { name: /Estado de Visita/i })).not.toBeInTheDocument();
  });

  it('el título distingue registrar de editar', () => {
    montar({ esEdicion: true });
    expect(screen.getByRole('heading', { name: /Editar Cronograma/i })).toBeInTheDocument();
  });
});

describe('ModalCronograma — envío', () => {
  it('el error del servidor queda a la vista', () => {
    montar({ error: 'El especialista ya no está disponible.' });

    expect(screen.getByText('El especialista ya no está disponible.')).toBeInTheDocument();
    expect(screen.getByText(/No se pudo guardar el cronograma/i)).toBeInTheDocument();
  });

  it('sin error no se muestra el recuadro', () => {
    montar();
    expect(screen.queryByText(/No se pudo guardar el cronograma/i)).not.toBeInTheDocument();
  });

  it('guardar envía el formulario', async () => {
    const { onEnviar } = montar({ form: { fechaHora: '2026-09-01T08:00' } });

    await userEvent.click(screen.getByRole('button', { name: /Guardar Cronograma/i }));
    expect(onEnviar).toHaveBeenCalled();
  });

  /**
   * La fecha lleva `required`, de modo que el navegador detiene el envío antes
   * de que el formulario se entere. La validación de `validarProgramacion` es
   * la segunda barrera, no la primera.
   */
  it('sin fecha el navegador detiene el envío', async () => {
    const { onEnviar } = montar({ form: { fechaHora: '' } });

    await userEvent.click(screen.getByRole('button', { name: /Guardar Cronograma/i }));
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it('cancelar no envía nada', async () => {
    const { onEnviar, onCerrar } = montar();

    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCerrar).toHaveBeenCalled();
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it('la cruz cierra el modal', async () => {
    const { onCerrar } = montar();

    await userEvent.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('ModalCronograma — tipo de monitoreo', () => {
  it('elegir directivo lo informa al formulario', async () => {
    const { onCambiar } = montar();

    await userEvent.click(screen.getByRole('button', { name: 'Directivo' }));
    expect(onCambiar).toHaveBeenCalledWith('tipo', 'DIRECTIVO');
  });

  it('el rótulo del evaluado sigue al tipo elegido', () => {
    montar({ form: { tipo: 'DIRECTIVO' } });
    expect(screen.getByRole('combobox', { name: /Directivo a Evaluar/i })).toBeInTheDocument();
  });
});
