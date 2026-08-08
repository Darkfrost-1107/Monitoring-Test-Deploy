import { describe, it, expect } from 'vitest';
import {
  FORMULARIO_CRONOGRAMA_VACIO,
  aplicarCambioDeAsignacion,
  fechaProgramadaPorDefecto,
  validarProgramacion,
  type FormularioCronograma,
} from './formulario';

/**
 * Pruebas del formulario de programación de una visita.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Doce `useState` y su validación vivían dentro
 * de `CronogramaPage`. La regla de fecha decide si una visita puede programarse
 * y no tenía cobertura pese a comparar contra el reloj del sistema, que es
 * donde se esconden los errores de borde.
 */

const formulario = (over: Partial<FormularioCronograma> = {}): FormularioCronograma => ({
  ...FORMULARIO_CRONOGRAMA_VACIO,
  modalidad: 'EBR',
  nivel: 'Primaria',
  monitorId: 'esp-1',
  institucionId: 'ie-1',
  evaluadoId: 'doc-1',
  fechaHora: '2026-08-10T09:00',
  ...over,
});

describe('FORMULARIO_CRONOGRAMA_VACIO', () => {
  it('arranca en la primera visita y en estado programado', () => {
    expect(FORMULARIO_CRONOGRAMA_VACIO.visita).toBe('01');
    expect(FORMULARIO_CRONOGRAMA_VACIO.estado).toBe('PROGRAMADO');
    expect(FORMULARIO_CRONOGRAMA_VACIO.tipo).toBe('DOCENTE');
  });
});

describe('aplicarCambioDeAsignacion', () => {
  const cargado = formulario();

  /**
   * La cascada es modalidad → nivel → especialista e institución: los tres
   * dependientes se calculan a partir de la modalidad, de modo que conservarlos
   * dejaría seleccionado a alguien que ya no figura entre las opciones.
   */
  it('cambiar la modalidad limpia nivel, especialista e institución', () => {
    const resultado = aplicarCambioDeAsignacion(cargado, 'modalidad', 'EBA');

    expect(resultado.modalidad).toBe('EBA');
    expect(resultado.nivel).toBe('');
    expect(resultado.monitorId).toBe('');
    expect(resultado.institucionId).toBe('');
  });

  it('cambiar el nivel limpia especialista e institución, no la modalidad', () => {
    const resultado = aplicarCambioDeAsignacion(cargado, 'nivel', 'Secundaria');

    expect(resultado.modalidad).toBe('EBR');
    expect(resultado.nivel).toBe('Secundaria');
    expect(resultado.monitorId).toBe('');
    expect(resultado.institucionId).toBe('');
  });

  it('cambiar la institución limpia el evaluado elegido', () => {
    const resultado = aplicarCambioDeAsignacion(cargado, 'institucionId', 'ie-9');
    expect(resultado.evaluadoId).toBe('');
  });

  it('cambiar el tipo de monitoreo limpia el evaluado elegido', () => {
    const resultado = aplicarCambioDeAsignacion(cargado, 'tipo', 'DIRECTIVO');
    expect(resultado.evaluadoId).toBe('');
    expect(resultado.institucionId).toBe('ie-1');
  });

  it('cambiar el especialista no limpia nada', () => {
    const resultado = aplicarCambioDeAsignacion(cargado, 'monitorId', 'esp-9');

    expect(resultado.monitorId).toBe('esp-9');
    expect(resultado.institucionId).toBe('ie-1');
    expect(resultado.nivel).toBe('Primaria');
  });

  it('no muta el formulario anterior', () => {
    aplicarCambioDeAsignacion(cargado, 'modalidad', 'EBA');
    expect(cargado.modalidad).toBe('EBR');
  });
});

describe('validarProgramacion — campos obligatorios', () => {
  it.each([
    'modalidad',
    'nivel',
    'monitorId',
    'institucionId',
    'evaluadoId',
    'fechaHora',
  ] as const)('exige %s', (campo) => {
    const incompleto = formulario({ [campo]: '' });
    expect(validarProgramacion(incompleto, { esEdicion: false })).toContain('obligatorios');
  });
});

describe('validarProgramacion — fecha en el pasado', () => {
  const ahora = new Date('2026-08-10T09:00:00');

  it('acepta una visita en el futuro', () => {
    const futura = formulario({ fechaHora: '2026-08-11T08:00' });
    expect(validarProgramacion(futura, { esEdicion: false, ahora })).toBeNull();
  });

  it('rechaza una visita en un día anterior', () => {
    const pasada = formulario({ fechaHora: '2026-08-09T23:59' });
    expect(validarProgramacion(pasada, { esEdicion: false, ahora })).toContain(
      'no puede ser anterior a la fecha actual',
    );
  });

  it('rechaza una visita hoy pero a una hora ya pasada', () => {
    const temprano = formulario({ fechaHora: '2026-08-10T08:59' });
    expect(validarProgramacion(temprano, { esEdicion: false, ahora })).toContain(
      'no puede ser anterior a la hora actual',
    );
  });

  it('acepta una visita hoy a la hora exacta', () => {
    const justo = formulario({ fechaHora: '2026-08-10T09:00' });
    expect(validarProgramacion(justo, { esEdicion: false, ahora })).toBeNull();
  });

  it('acepta una visita hoy más tarde', () => {
    const luego = formulario({ fechaHora: '2026-08-10T09:01' });
    expect(validarProgramacion(luego, { esEdicion: false, ahora })).toBeNull();
  });

  /**
   * Al editar no se revalida la fecha: una visita ya programada que quedó en el
   * pasado debe poder corregirse en sus otros campos sin obligar a reprogramarla.
   */
  it('no revalida la fecha al editar', () => {
    const pasada = formulario({ fechaHora: '2020-01-01T08:00' });
    expect(validarProgramacion(pasada, { esEdicion: true, ahora })).toBeNull();
  });
});

describe('fechaProgramadaPorDefecto', () => {
  it('propone el día siguiente a las ocho', () => {
    expect(fechaProgramadaPorDefecto(new Date('2026-08-10T15:30:00'))).toBe('2026-08-11T08:00');
  });

  it('cruza el fin de mes', () => {
    expect(fechaProgramadaPorDefecto(new Date('2026-08-31T15:30:00'))).toBe('2026-09-01T08:00');
  });

  it('cruza el fin de año', () => {
    expect(fechaProgramadaPorDefecto(new Date('2026-12-31T15:30:00'))).toBe('2027-01-01T08:00');
  });
});
