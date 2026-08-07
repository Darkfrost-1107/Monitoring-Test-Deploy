import { describe, it, expect } from 'vitest';
import {
  DATOS_BASICOS_VACIOS,
  soloDefinidos,
  datosBasicosDePersona,
  escalaMagisterialARomano,
  especialidadDeDocente,
  opcionesDeInstitucion,
} from './persona-formulario';

/**
 * Pruebas del traspaso de una persona ya registrada al formulario.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-18. Estas conversiones estaban escritas en
 * los tres formularios de persona —docente, especialista y director—, dentro de
 * `setPersonaFields`. Se ejecutan al autocompletar por DNI, de modo que
 * deciden con qué datos queda cargada una persona que ya existe en el padrón.
 */

const persona = (over: Record<string, unknown> = {}) => ({
  nombres: 'Ana',
  apellidos: 'Torres',
  correo: 'ana@ugel.gob.pe',
  telefono: '987654321',
  ...over,
});

describe('datosBasicosDePersona', () => {
  it('traslada nombre, apellidos, correo y teléfono', () => {
    expect(datosBasicosDePersona(persona())).toEqual({
      nombres: 'Ana',
      apellidos: 'Torres',
      correo: 'ana@ugel.gob.pe',
      celular: '987654321',
    });
  });

  /**
   * El padrón no siempre trae contacto. Se completa con cadena vacía y no con
   * `undefined` porque estos valores alimentan campos controlados: un
   * `undefined` convertiría el campo en no controlado a mitad de la edición.
   */
  it('completa con cadena vacía el contacto ausente', () => {
    const sinContacto = datosBasicosDePersona(persona({ correo: null, telefono: null }));

    expect(sinContacto.correo).toBe('');
    expect(sinContacto.celular).toBe('');
  });

  it('renombra teléfono a celular, que es como lo llama el formulario', () => {
    expect(datosBasicosDePersona(persona({ telefono: '111' })).celular).toBe('111');
  });
});

describe('DATOS_BASICOS_VACIOS', () => {
  it('deja los cuatro campos en blanco', () => {
    expect(DATOS_BASICOS_VACIOS).toEqual({
      nombres: '',
      apellidos: '',
      correo: '',
      celular: '',
    });
  });
});

describe('escalaMagisterialARomano', () => {
  it.each([
    [1, 'I'],
    [2, 'II'],
    [3, 'III'],
    [4, 'IV'],
    [5, 'V'],
    [6, 'VI'],
    [7, 'VII'],
    [8, 'VIII'],
  ])('traduce la escala %i a %s', (numero, esperado) => {
    expect(escalaMagisterialARomano(numero, '')).toBe(esperado);
  });

  /**
   * DISCREPANCIA CONSERVADA. El mismo mapa estaba escrito en dos formularios
   * con respaldos distintos: el de docente caía a cadena vacía y el de director
   * al nivel I. Se conserva el respaldo como parámetro para no cambiar el
   * comportamiento de ninguno de los dos, y para que la diferencia quede a la
   * vista en lugar de escondida en dos archivos.
   */
  it('usa el respaldo que indique quien llama, ante una escala desconocida', () => {
    expect(escalaMagisterialARomano(99, '')).toBe('');
    expect(escalaMagisterialARomano(99, 'I')).toBe('I');
  });

  it('usa el respaldo cuando no hay escala', () => {
    expect(escalaMagisterialARomano(undefined, '')).toBe('');
    expect(escalaMagisterialARomano(0, 'I')).toBe('I');
  });
});

describe('especialidadDeDocente', () => {
  it('prefiere la especialidad declarada', () => {
    expect(especialidadDeDocente({ especialidad: 'Matemática', cursoAsignado: 'CTA' })).toBe(
      'Matemática',
    );
  });

  /** El curso asignado es el respaldo histórico de quienes no tienen especialidad. */
  it('cae al curso asignado cuando no hay especialidad', () => {
    expect(especialidadDeDocente({ cursoAsignado: 'CTA' })).toBe('CTA');
  });

  it('devuelve undefined cuando no hay ninguno de los dos', () => {
    expect(especialidadDeDocente({})).toBeUndefined();
    expect(especialidadDeDocente(undefined)).toBeUndefined();
  });

  it('ignora una especialidad vacía y usa el curso', () => {
    expect(especialidadDeDocente({ especialidad: '', cursoAsignado: 'CTA' })).toBe('CTA');
  });
});

describe('soloDefinidos', () => {
  it('conserva los campos con valor', () => {
    expect(soloDefinidos({ a: 'x', b: 3 })).toEqual({ a: 'x', b: 3 });
  });

  /**
   * Un campo que el padrón no trae no debe pisar lo que el usuario ya escribió
   * en el formulario. Cadena vacía cuenta como ausente: es lo que devuelve la
   * API cuando el dato no está cargado.
   */
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['cadena vacía', ''],
  ])('descarta el campo en %s', (_caso, valor) => {
    expect(soloDefinidos({ a: 'x', b: valor })).toEqual({ a: 'x' });
  });

  it('conserva el cero, que es un valor legítimo', () => {
    expect(soloDefinidos({ cantidad: 0 })).toEqual({ cantidad: 0 });
  });

  it('conserva el false, que es un valor legítimo', () => {
    expect(soloDefinidos({ activo: false })).toEqual({ activo: false });
  });

  it('devuelve un objeto vacío si nada tiene valor', () => {
    expect(soloDefinidos({ a: undefined, b: null })).toEqual({});
  });
});

describe('opcionesDeInstitucion', () => {
  const ie = (id: string, nombre: string) => ({ id, nombre });

  it('convierte la lista disponible en opciones del selector', () => {
    expect(opcionesDeInstitucion([ie('a', 'IE 1'), ie('b', 'IE 2')])).toEqual([
      { value: 'a', label: 'IE 1' },
      { value: 'b', label: 'IE 2' },
    ]);
  });

  /**
   * El autocompletado por DNI puede traer a alguien cuya I.E. no está en la
   * lista recibida. Sin agregarla el selector se abre vacío sobre un valor que
   * sí está puesto, y guardar le borra la institución que ya tenía.
   */
  it('agrega la institución de la persona cuando no figura', () => {
    const opciones = opcionesDeInstitucion([ie('a', 'IE 1')], ie('z', 'IE Lejana'));
    expect(opciones).toContainEqual({ value: 'z', label: 'IE Lejana' });
  });

  it('no la duplica cuando ya figura', () => {
    const opciones = opcionesDeInstitucion([ie('a', 'IE 1')], ie('a', 'IE 1'));
    expect(opciones).toHaveLength(1);
  });

  it('sin persona devuelve sólo las disponibles', () => {
    expect(opcionesDeInstitucion([ie('a', 'IE 1')], null)).toHaveLength(1);
    expect(opcionesDeInstitucion([], undefined)).toEqual([]);
  });
});
