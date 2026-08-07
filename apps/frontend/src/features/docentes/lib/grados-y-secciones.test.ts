import { describe, it, expect } from 'vitest';
import {
  GRADOS_POR_NIVEL,
  gradosDelNivel,
  especialidadesDelNivel,
  condicionesDelCargo,
  cargosDisponibles,
  agregarSeccion,
} from './grados-y-secciones';

/**
 * Qué grados, especialidades y condiciones ofrece el formulario de docente
 * según el nivel y el cargo, y cómo se arma la lista de secciones a cargo.
 *
 * Vivía dentro de `DocenteFormBase`, en cuatro funciones anónimas escritas
 * dentro de los props `options={...}` de otros tantos selectores.
 */

describe('gradosDelNivel', () => {
  it('devuelve los grados de cada nivel', () => {
    expect(gradosDelNivel('INICIAL')).toEqual(['3 años', '4 años', '5 años']);
    expect(gradosDelNivel('PRIMARIA')).toHaveLength(6);
    expect(gradosDelNivel('SECUNDARIA')).toHaveLength(5);
  });

  it('devuelve una lista vacía ante un nivel que no conoce', () => {
    expect(gradosDelNivel('EBA')).toEqual([]);
  });

  it('no expone el arreglo interno, para que nadie lo modifique de rebote', () => {
    gradosDelNivel('PRIMARIA').push('7°');
    expect(GRADOS_POR_NIVEL.PRIMARIA).toHaveLength(6);
  });
});

describe('especialidadesDelNivel', () => {
  it('en Inicial sólo hay «General»', () => {
    expect(especialidadesDelNivel('INICIAL')).toEqual(['General']);
  });

  it('en Primaria hay tres', () => {
    expect(especialidadesDelNivel('PRIMARIA')).toEqual(['General', 'PIP', 'Educación Física']);
  });

  it('en Secundaria son las áreas curriculares', () => {
    const areas = especialidadesDelNivel('SECUNDARIA');
    expect(areas).toContain('Matemática');
    expect(areas).toContain('Educación para el Trabajo');
  });

  /**
   * Un docente puede tener registrada una especialidad que no figura en el
   * catálogo. Si no se agrega, el selector se abre vacío y guardar el
   * formulario le borra el dato que ya tenía.
   */
  it('incluye la especialidad actual aunque no esté en el catálogo', () => {
    const areas = especialidadesDelNivel('SECUNDARIA', 'Robótica');
    expect(areas).toContain('Robótica');
  });

  it('no la duplica cuando ya figura', () => {
    const areas = especialidadesDelNivel('SECUNDARIA', 'Matemática');
    expect(areas.filter((a) => a === 'Matemática')).toHaveLength(1);
  });

  it('ignora una especialidad actual vacía', () => {
    expect(especialidadesDelNivel('SECUNDARIA', '')).not.toContain('');
  });
});

describe('condicionesDelCargo', () => {
  it('el director tiene condiciones directivas', () => {
    expect(condicionesDelCargo('Director')).toEqual(['Designado', 'Encargado', 'Por Función']);
  });

  it('el resto tiene las condiciones docentes', () => {
    expect(condicionesDelCargo('Docente de Aula')).toContain('Nombrado');
    expect(condicionesDelCargo('Docente de Aula')).not.toContain('Por Función');
  });
});

describe('cargosDisponibles', () => {
  /**
   * Coordinador Pedagógico y Jefe de Taller sólo existen en Secundaria.
   */
  it('en Secundaria ofrece los tres cargos de institución', () => {
    expect(cargosDisponibles('SECUNDARIA', 'Docente de Aula')).toEqual([
      'Coordinador Pedagógico',
      'Jefe de Taller',
      'Docente de Aula',
    ]);
  });

  it('fuera de Secundaria sólo docente de aula', () => {
    expect(cargosDisponibles('PRIMARIA', 'Docente de Aula')).toEqual(['Docente de Aula']);
    expect(cargosDisponibles('INICIAL', 'Docente de Aula')).toEqual(['Docente de Aula']);
  });

  /**
   * El cargo de director no se elige acá, pero si el registro ya lo tiene hay
   * que ofrecerlo: sin eso el selector se abre en otro cargo y guardar degrada
   * al director sin que nadie lo pidiera.
   */
  it('antepone Director cuando ya es el cargo actual', () => {
    expect(cargosDisponibles('PRIMARIA', 'Director')).toEqual(['Director', 'Docente de Aula']);
  });
});

describe('agregarSeccion', () => {
  const seccion = (grado: string, letra: string) => ({ id: `${grado}-${letra}`, grado, seccion: letra });

  it('agrega la sección normalizando la letra a mayúscula', () => {
    const resultado = agregarSeccion([], '3°', ' a ');
    expect(resultado.ok).toBe(true);
    expect(resultado.secciones?.[0]).toMatchObject({ grado: '3°', seccion: 'A' });
  });

  /**
   * Antes cada uno de estos rechazos era un `return` mudo: el usuario pulsaba
   * «Añadir» y no pasaba nada, sin ninguna explicación.
   */
  it('explica por qué rechaza una sección sin grado', () => {
    const resultado = agregarSeccion([], '', 'A');
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBeTruthy();
  });

  it('explica por qué rechaza una sección sin letra', () => {
    expect(agregarSeccion([], '3°', '  ')).toMatchObject({ ok: false });
  });

  it('explica por qué rechaza una letra de más de un carácter', () => {
    const resultado = agregarSeccion([], '3°', 'AB');
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toContain('una sola letra');
  });

  it('explica por qué rechaza una sección repetida', () => {
    const resultado = agregarSeccion([seccion('3°', 'A')], '3°', 'a');
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toContain('ya');
  });

  it('deja agregar la misma letra en otro grado', () => {
    const resultado = agregarSeccion([seccion('3°', 'A')], '4°', 'A');
    expect(resultado.ok).toBe(true);
    expect(resultado.secciones).toHaveLength(2);
  });

  it('no modifica la lista que recibe', () => {
    const previas = [seccion('3°', 'A')];
    agregarSeccion(previas, '4°', 'B');
    expect(previas).toHaveLength(1);
  });
});
