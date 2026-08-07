import { describe, it, expect } from 'vitest';
import {
  FILTROS_INICIALES,
  FILTROS_VISIBLES_POR_PERFIL,
  SIN_FILTRAR,
  aplicarCambioDeFiltro,
  hayFiltroActivo,
  type FiltrosCalendario,
} from './filtros';

/**
 * Pruebas del estado de filtros del calendario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Los seis filtros viajaban como doce props
 * valor/setter desde `CalendarioPage` hasta `CalendarioGrid`. Eso no es una
 * interfaz de componente: es estado de formulario transportado a mano.
 *
 * Dos reglas que vivían sueltas en el padre y ahora quedan cubiertas: el
 * encadenado modalidad → nivel, y qué cuenta como «hay filtros activos», que
 * depende del perfil porque cada uno ve controles distintos.
 */

const filtros = (over: Partial<FiltrosCalendario> = {}): FiltrosCalendario => ({
  ...FILTROS_INICIALES,
  ...over,
});

describe('FILTROS_INICIALES', () => {
  it('arranca sin filtrar en los seis campos', () => {
    expect(Object.values(FILTROS_INICIALES).every((v) => v === SIN_FILTRAR)).toBe(true);
  });
});

describe('FILTROS_VISIBLES_POR_PERFIL', () => {
  it('el director de institución filtra por tipo, especialista, visita y estado', () => {
    expect([...FILTROS_VISIBLES_POR_PERFIL.director].sort()).toEqual([
      'especialista',
      'estado',
      'nroVisita',
      'tipo',
    ]);
  });

  it('la UGEL filtra por modalidad, nivel, especialista y tipo', () => {
    expect([...FILTROS_VISIBLES_POR_PERFIL.ugel].sort()).toEqual([
      'especialista',
      'modalidad',
      'nivel',
      'tipo',
    ]);
  });
});

describe('aplicarCambioDeFiltro', () => {
  it('actualiza el campo indicado', () => {
    expect(aplicarCambioDeFiltro(filtros(), 'tipo', 'DOCENTE').tipo).toBe('DOCENTE');
  });

  it('no toca los demás campos', () => {
    const resultado = aplicarCambioDeFiltro(filtros({ estado: 'COMPLETADO' }), 'tipo', 'DOCENTE');
    expect(resultado.estado).toBe('COMPLETADO');
  });

  /**
   * Encadenado: los niveles disponibles dependen de la modalidad, de modo que
   * conservar el nivel anterior deja seleccionado uno que puede no existir en la
   * modalidad nueva, y la lista queda vacía sin explicación.
   */
  it('reinicia el nivel al cambiar de modalidad', () => {
    const previo = filtros({ modalidad: 'EBR', nivel: 'Secundaria' });
    const resultado = aplicarCambioDeFiltro(previo, 'modalidad', 'EBA');

    expect(resultado.modalidad).toBe('EBA');
    expect(resultado.nivel).toBe(SIN_FILTRAR);
  });

  it('reinicia el nivel incluso al volver a no filtrar por modalidad', () => {
    const previo = filtros({ modalidad: 'EBR', nivel: 'Secundaria' });
    expect(aplicarCambioDeFiltro(previo, 'modalidad', SIN_FILTRAR).nivel).toBe(SIN_FILTRAR);
  });

  it('no reinicia nada al cambiar el nivel', () => {
    const previo = filtros({ modalidad: 'EBR', nivel: 'Primaria' });
    const resultado = aplicarCambioDeFiltro(previo, 'nivel', 'Secundaria');

    expect(resultado.modalidad).toBe('EBR');
    expect(resultado.nivel).toBe('Secundaria');
  });

  it('devuelve un objeto nuevo en lugar de mutar el anterior', () => {
    const previo = filtros();
    const resultado = aplicarCambioDeFiltro(previo, 'tipo', 'DOCENTE');

    expect(resultado).not.toBe(previo);
    expect(previo.tipo).toBe(SIN_FILTRAR);
  });
});

describe('hayFiltroActivo', () => {
  it('es falso sin ningún filtro puesto', () => {
    expect(hayFiltroActivo(filtros(), 'ugel')).toBe(false);
    expect(hayFiltroActivo(filtros(), 'director')).toBe(false);
  });

  it.each(['modalidad', 'nivel', 'especialista', 'tipo'] as const)(
    'para la UGEL, %s cuenta como filtro activo',
    (campo) => {
      expect(hayFiltroActivo(filtros({ [campo]: 'algo' }), 'ugel')).toBe(true);
    },
  );

  it.each(['tipo', 'especialista', 'nroVisita', 'estado'] as const)(
    'para el director, %s cuenta como filtro activo',
    (campo) => {
      expect(hayFiltroActivo(filtros({ [campo]: 'algo' }), 'director')).toBe(true);
    },
  );

  /**
   * Cada perfil ve un juego distinto de controles. Un filtro que no se le
   * muestra no puede haberlo puesto, y contarlo encendería el botón de limpiar
   * sin que tenga nada visible que limpiar.
   */
  it('ignora los filtros que el perfil no ve', () => {
    expect(hayFiltroActivo(filtros({ estado: 'COMPLETADO' }), 'ugel')).toBe(false);
    expect(hayFiltroActivo(filtros({ modalidad: 'EBR' }), 'director')).toBe(false);
  });
});
