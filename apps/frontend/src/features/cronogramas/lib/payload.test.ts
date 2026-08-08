import { describe, it, expect } from 'vitest';
import {
  FORMULARIO_CRONOGRAMA_VACIO,
  type FormularioCronograma,
} from './formulario';
import { aPayloadDeCreacion, aPayloadDeEdicion, resolverReferencias } from './payload';

/**
 * Pruebas de la traducción del formulario al contrato de la API.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estaba dentro de `handleFormSubmit`, mezclada
 * con la orquestación de guardado, navegación y avisos.
 *
 * El formulario guardaba nombres y acá se los revertía a identificador
 * comparando cadenas. Con tres nombres de institución repetidos en la base, esa
 * comparación devolvía siempre la primera coincidencia. Ahora el formulario ya
 * lleva identificadores y lo único que queda es comprobar que existan.
 */

const formulario = (over: Partial<FormularioCronograma> = {}): FormularioCronograma => ({
  ...FORMULARIO_CRONOGRAMA_VACIO,
  monitorId: 'esp-1',
  institucionId: 'ie-1',
  evaluadoId: 'doc-1',
  modalidad: 'EBR',
  nivel: 'Primaria',
  visita: '02',
  fechaHora: '2026-08-11T08:00',
  ...over,
});

const catalogo = {
  especialistas: [{ id: 'esp-1' }, { id: 'esp-2' }],
  instituciones: [{ id: 'ie-1' }, { id: 'ie-2' }],
  docentes: [{ id: 'doc-1' }, { id: 'doc-2' }],
};

describe('resolverReferencias', () => {
  it('devuelve los tres identificadores elegidos', () => {
    expect(resolverReferencias(formulario(), catalogo)).toEqual({
      monitorId: 'esp-1',
      institucionId: 'ie-1',
      evaluadoId: 'doc-1',
    });
  });

  it('respeta el que se eligió, no el primero del catálogo', () => {
    const otro = formulario({ institucionId: 'ie-2', evaluadoId: 'doc-2' });
    expect(resolverReferencias(otro, catalogo)).toMatchObject({
      institucionId: 'ie-2',
      evaluadoId: 'doc-2',
    });
  });

  it.each([
    ['especialista', { monitorId: 'esp-inexistente' }],
    ['institucion', { institucionId: 'ie-inexistente' }],
    ['evaluado', { evaluadoId: 'doc-inexistente' }],
  ])('devuelve null cuando el %s ya no está en el catálogo', (_campo, over) => {
    expect(resolverReferencias(formulario(over), catalogo)).toBeNull();
  });

  it.each([
    ['especialista', { monitorId: '' }],
    ['institucion', { institucionId: '' }],
    ['evaluado', { evaluadoId: '' }],
  ])('devuelve null cuando falta el %s', (_campo, over) => {
    expect(resolverReferencias(formulario(over), catalogo)).toBeNull();
  });
});

describe('aPayloadDeCreacion', () => {
  const referencias = { monitorId: 'esp-1', institucionId: 'ie-1', evaluadoId: 'doc-1' };

  it('separa la fecha de la hora', () => {
    const payload = aPayloadDeCreacion(formulario(), referencias);

    expect(payload.fechaProgramada).toBe('2026-08-11');
    expect(payload.horaInicio).toBe('08:00:00');
  });

  /**
   * El campo `datetime-local` entrega `HH:MM`, pero la API espera segundos.
   * Algunos navegadores incluyen los segundos, y entonces no hay que agregarlos.
   */
  it('respeta la hora que ya trae segundos', () => {
    const conSegundos = formulario({ fechaHora: '2026-08-11T08:30:45' });
    expect(aPayloadDeCreacion(conSegundos, referencias).horaInicio).toBe('08:30:45');
  });

  it('convierte el número de visita a entero', () => {
    expect(aPayloadDeCreacion(formulario({ visita: '03' }), referencias).numeroVisita).toBe(3);
  });

  it('omite los detalles cuando están en blanco', () => {
    expect(aPayloadDeCreacion(formulario({ observaciones: '   ' }), referencias).detalles).toBeUndefined();
  });

  it('conserva los detalles cargados', () => {
    const conDetalle = formulario({ observaciones: '  Coordinar con el director  ' });
    expect(aPayloadDeCreacion(conDetalle, referencias).detalles).toBe('Coordinar con el director');
  });

  it('traslada las referencias resueltas', () => {
    const payload = aPayloadDeCreacion(formulario(), referencias);

    expect(payload.monitorId).toBe('esp-1');
    expect(payload.institucionId).toBe('ie-1');
    expect(payload.evaluadoId).toBe('doc-1');
  });
});

describe('aPayloadDeEdicion', () => {
  /**
   * En edición sólo viajan detalles y estado. La fecha se cambia por solicitud
   * de reprogramación, y el resto define la identidad de la visita.
   */
  it('sólo envía detalles y estado', () => {
    const payload = aPayloadDeEdicion(formulario({ observaciones: 'Nota', estado: 'CANCELADO' }));
    expect(payload).toEqual({ detalles: 'Nota', estado: 'CANCELADO' });
  });

  it('omite los detalles en blanco', () => {
    expect(aPayloadDeEdicion(formulario({ observaciones: '  ' })).detalles).toBeUndefined();
  });
});
