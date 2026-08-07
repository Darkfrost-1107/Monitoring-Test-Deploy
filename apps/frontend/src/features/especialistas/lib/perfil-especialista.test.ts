import { describe, it, expect } from 'vitest';
import {
  ESPECIALIDADES_DE_PRIMARIA,
  OPCIONES_DE_ESCALA,
  SIN_ESCALA,
  erroresDelPerfil,
  especialidadesReunidas,
  perfilAlCambiarModalidad,
  agregarEspecialidadExtra,
} from './perfil-especialista';

/**
 * Las reglas del perfil de un especialista: qué especialidad corresponde a cada
 * nivel y cómo se arma la lista que se guarda. Vivían dentro de
 * `EspecialistaFormBase`, un componente de 490 líneas.
 */

describe('erroresDelPerfil', () => {
  it('en Secundaria exige especialidad principal', () => {
    const errores = erroresDelPerfil({ cargo: 'Especialista', nivelEducativo: 'Secundaria' });
    expect(errores.especialidad).toBeTruthy();
  });

  it('en Secundaria acepta una especialidad cualquiera', () => {
    const errores = erroresDelPerfil({
      cargo: 'Especialista',
      nivelEducativo: 'Secundaria',
      especialidad: 'Matemática',
    });
    expect(errores).toEqual({});
  });

  it('no exige especialidad si sólo hay espacios', () => {
    const errores = erroresDelPerfil({
      cargo: 'Jefe de Área',
      nivelEducativo: 'Secundaria',
      especialidad: '   ',
    });
    expect(errores.especialidad).toBeTruthy();
  });

  it('en Primaria la especialidad del especialista debe ser PIP o Educación Física', () => {
    const errores = erroresDelPerfil({
      cargo: 'Especialista',
      nivelEducativo: 'Primaria',
      especialidad: 'Matemática',
    });
    expect(errores.especialidad).toBeTruthy();
  });

  it.each(ESPECIALIDADES_DE_PRIMARIA)('en Primaria acepta %s', (especialidad) => {
    const errores = erroresDelPerfil({
      cargo: 'Especialista',
      nivelEducativo: 'Primaria',
      especialidad,
    });
    expect(errores).toEqual({});
  });

  /**
   * «Educacion Fisica» sin tildes llega desde registros antiguos y desde
   * `cursoAsignado` del docente. Rechazarla obligaría a corregir a mano un dato
   * que el propio sistema autocompletó.
   */
  it('en Primaria acepta «Educacion Fisica» sin tildes', () => {
    const errores = erroresDelPerfil({
      cargo: 'Especialista',
      nivelEducativo: 'Primaria',
      especialidad: 'Educacion Fisica',
    });
    expect(errores).toEqual({});
  });

  it('en Primaria la especialidad es opcional', () => {
    expect(erroresDelPerfil({ cargo: 'Especialista', nivelEducativo: 'Primaria' })).toEqual({});
  });

  it('el jefe de gestión no queda sujeto a estas reglas', () => {
    const errores = erroresDelPerfil({ cargo: 'Jefe de Gestión', nivelEducativo: 'Secundaria' });
    expect(errores).toEqual({});
  });
});

describe('especialidadesReunidas', () => {
  it('pone la principal primero y luego las extras', () => {
    expect(especialidadesReunidas('Matemática', ['Física', 'Química'])).toEqual([
      'Matemática',
      'Física',
      'Química',
    ]);
  });

  it('sin principal devuelve sólo las extras', () => {
    expect(especialidadesReunidas('', ['Física'])).toEqual(['Física']);
  });

  it('sin ninguna devuelve la lista vacía', () => {
    expect(especialidadesReunidas(undefined, undefined)).toEqual([]);
  });

  it('no repite una extra igual a la principal', () => {
    expect(especialidadesReunidas('Física', ['Física'])).toEqual(['Física']);
  });
});

describe('perfilAlCambiarModalidad', () => {
  it('toma el primer nivel de la modalidad elegida', () => {
    const perfil = perfilAlCambiarModalidad('EBR');
    expect(perfil.nivelEducativo).toBeTruthy();
  });

  /**
   * Las especialidades pertenecen al nivel: conservarlas al cambiar de
   * modalidad dejaría guardada una mención que ese nivel no contempla.
   */
  it('vacía las especialidades', () => {
    const perfil = perfilAlCambiarModalidad('EBA');
    expect(perfil.especialidad).toBe('');
    expect(perfil.especialidades).toEqual([]);
    expect(perfil.especialidadesExtras).toEqual([]);
  });

  it('ante una modalidad desconocida deja el nivel vacío en vez de inventarlo', () => {
    expect(perfilAlCambiarModalidad('INEXISTENTE').nivelEducativo).toBe('');
  });
});

describe('agregarEspecialidadExtra', () => {
  it('agrega la especialidad recortando los espacios', () => {
    expect(agregarEspecialidadExtra([], '  Física ', 'Matemática')).toEqual({
      ok: true,
      extras: ['Física'],
    });
  });

  it('rechaza el texto vacío', () => {
    expect(agregarEspecialidadExtra([], '   ', 'Matemática').ok).toBe(false);
  });

  it('rechaza la que ya es la principal, sin distinguir mayúsculas', () => {
    const resultado = agregarEspecialidadExtra([], 'matemática', 'Matemática');
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBeTruthy();
  });

  /**
   * La comparación de duplicados era sensible a mayúsculas: «Física» y
   * «física» entraban las dos y se guardaban como menciones distintas.
   */
  it('rechaza una repetida sin distinguir mayúsculas', () => {
    const resultado = agregarEspecialidadExtra(['Física'], 'FÍSICA', 'Matemática');
    expect(resultado.ok).toBe(false);
  });

  it('no modifica la lista que recibe', () => {
    const previas = ['Física'];
    agregarEspecialidadExtra(previas, 'Química', 'Matemática');
    expect(previas).toEqual(['Física']);
  });
});

describe('OPCIONES_DE_ESCALA', () => {
  it('ofrece «sin escala» y las ocho escalas', () => {
    expect(OPCIONES_DE_ESCALA).toHaveLength(9);
    expect(OPCIONES_DE_ESCALA[0].value).toBe(SIN_ESCALA);
    expect(OPCIONES_DE_ESCALA[1]).toEqual({ value: '1', label: 'Escala I' });
    expect(OPCIONES_DE_ESCALA[8]).toEqual({ value: '8', label: 'Escala VIII' });
  });
});
