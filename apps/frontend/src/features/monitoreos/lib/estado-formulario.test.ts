import { describe, it, expect } from 'vitest';
import {
  FORMULARIO_VACIO,
  aDatosFicha,
  hidratarFormulario,
  leerEstadoGuardado,
  tieneContextoCargado,
} from './estado-formulario';

/**
 * Pruebas del estado del formulario de ficha.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `LlenarFichaForm` tenía diecinueve `useState`
 * y el mismo bloque de catorce asignaciones escrito cuatro veces —una por cada
 * origen posible del estado inicial—. Cuatro copias que había que mantener a la
 * par cada vez que se agregaba un campo.
 */

describe('FORMULARIO_VACIO', () => {
  it('arranca sin respuestas ni textos', () => {
    expect(FORMULARIO_VACIO.selectedLevels).toEqual({});
    expect(FORMULARIO_VACIO.generalComments).toBe('');
    expect(FORMULARIO_VACIO.contexto.area).toBe('');
  });

  it('deja vacía la cantidad de estudiantes en lugar de ponerla en cero', () => {
    // Un cero es una respuesta; la ausencia de respuesta no lo es.
    expect(FORMULARIO_VACIO.contexto.alumnos).toBe('');
    expect(FORMULARIO_VACIO.contexto.alumnosNee).toBe('');
  });
});

describe('hidratarFormulario', () => {
  it('devuelve el formulario vacío sin fuente', () => {
    expect(hidratarFormulario(null)).toEqual(FORMULARIO_VACIO);
    expect(hidratarFormulario(undefined)).toEqual(FORMULARIO_VACIO);
  });

  it('copia las respuestas presentes', () => {
    const estado = hidratarFormulario({
      selectedLevels: { d1: 'III' },
      rubricComments: { d1: 'Bien.' },
      generalComments: 'Observación general.',
    });

    expect(estado.selectedLevels).toEqual({ d1: 'III' });
    expect(estado.rubricComments).toEqual({ d1: 'Bien.' });
    expect(estado.generalComments).toBe('Observación general.');
  });

  it('completa con vacíos los campos ausentes', () => {
    const estado = hidratarFormulario({ selectedLevels: { d1: 'III' } });

    expect(estado.checkedAspects).toEqual({});
    expect(estado.sugerencias).toBe('');
    expect(estado.compromisos).toBe('');
  });

  it('traduce el contexto de aula al formato del formulario', () => {
    const estado = hidratarFormulario({
      contexto: {
        areaCurricular: 'Matemática',
        grado: '3',
        seccion: 'B',
        cantidadEstudiantes: 28,
        cantidadEstudiantesNee: 2,
      },
    });

    expect(estado.contexto).toEqual({
      area: 'Matemática',
      grado: '3',
      seccion: 'B',
      alumnos: 28,
      alumnosNee: 2,
    });
  });

  it('deja el contexto vacío cuando la fuente no lo trae', () => {
    expect(hidratarFormulario({ selectedLevels: {} }).contexto).toEqual(FORMULARIO_VACIO.contexto);
  });
});

describe('leerEstadoGuardado', () => {
  it('interpreta el estado local serializado', () => {
    const guardado = JSON.stringify({ selectedLevels: { d1: 'IV' } });
    expect(leerEstadoGuardado(guardado)?.selectedLevels).toEqual({ d1: 'IV' });
  });

  it('devuelve null sin estado guardado', () => {
    expect(leerEstadoGuardado(null)).toBeNull();
  });

  /**
   * Un estado local corrupto no debe impedir abrir la ficha: se descarta y el
   * evaluador arranca en blanco, que es lo que hacía el componente.
   */
  it('descarta un estado corrupto en lugar de fallar', () => {
    expect(leerEstadoGuardado('{roto')).toBeNull();
  });
});

describe('tieneContextoCargado', () => {
  it('reconoce el contexto cuando hay área', () => {
    expect(tieneContextoCargado({ areaCurricular: 'Comunicación' })).toBe(true);
  });

  it('reconoce el contexto cuando hay grado o sección', () => {
    expect(tieneContextoCargado({ grado: '3' })).toBe(true);
    expect(tieneContextoCargado({ seccion: 'A' })).toBe(true);
  });

  /**
   * La cantidad de estudiantes no cuenta: se llena sola en algunos flujos y
   * tomarla como contexto cargado impediría autocompletar área y grado desde
   * la ficha del docente.
   */
  it('no cuenta la cantidad de estudiantes como contexto', () => {
    expect(tieneContextoCargado({ cantidadEstudiantes: 30 })).toBe(false);
  });

  it('es falso sin contexto', () => {
    expect(tieneContextoCargado(undefined)).toBe(false);
    expect(tieneContextoCargado({})).toBe(false);
  });
});

describe('aDatosFicha', () => {
  const cargado = hidratarFormulario({
    selectedLevels: { d1: 'III' },
    contexto: {
      areaCurricular: 'Matemática',
      grado: '3',
      seccion: 'B',
      cantidadEstudiantes: 28,
      cantidadEstudiantesNee: 2,
    },
  });

  it('incluye el contexto de aula en un monitoreo a docente', () => {
    expect(aDatosFicha(cargado, 'DOCENTE').contexto).toEqual({
      areaCurricular: 'Matemática',
      grado: '3',
      seccion: 'B',
      cantidadEstudiantes: 28,
      cantidadEstudiantesNee: 2,
    });
  });

  /**
   * Un monitoreo a directivo no ocurre en un aula: no tiene área, grado ni
   * sección que registrar.
   */
  it('omite el contexto en un monitoreo a directivo', () => {
    expect(aDatosFicha(cargado, 'DIRECTIVO').contexto).toBeUndefined();
  });

  it('convierte una cantidad sin cargar en cero', () => {
    const sinAlumnos = hidratarFormulario({ contexto: { areaCurricular: 'Arte' } });
    const datos = aDatosFicha(sinAlumnos, 'DOCENTE');

    expect(datos.contexto?.cantidadEstudiantes).toBe(0);
    expect(datos.contexto?.cantidadEstudiantesNee).toBe(0);
  });

  it('traslada las respuestas tal cual', () => {
    expect(aDatosFicha(cargado, 'DOCENTE').selectedLevels).toEqual({ d1: 'III' });
  });
});
