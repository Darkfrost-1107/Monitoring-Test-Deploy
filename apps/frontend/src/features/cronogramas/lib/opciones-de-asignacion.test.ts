import { describe, it, expect } from 'vitest';
import {
  etiquetaDeInstitucion,
  opcionesDeInstitucion,
  opcionesDeEspecialista,
  opcionesDeEvaluadorInterno,
  type EvaluadorInterno,
  type InstitucionOfrecible,
} from './opciones-de-asignacion';

/**
 * Las opciones que el formulario de programación ofrece en sus selectores.
 *
 * Antes cada selector se armaba con `{ value: nombre, label: nombre }` y la
 * traducción de vuelta a identificador se hacía al guardar, comparando cadenas.
 * En la base de la UGEL hay tres nombres de institución repetidos —uno de ellos
 * cinco veces, en cinco distritos— de modo que el usuario veía cinco opciones
 * idénticas y todas valían lo mismo.
 */

const ie = (over: Partial<InstitucionOfrecible> = {}): InstitucionOfrecible => ({
  id: 'ie-1',
  nombre: 'CHILAHUITO',
  nivelEducativo: 'Inicial',
  distrito: 'Paratia',
  ...over,
});

describe('etiquetaDeInstitucion', () => {
  it('es el nombre a secas cuando ninguno lo repite', () => {
    const lista = [ie({ id: 'a', nombre: 'IE 70001' }), ie({ id: 'b', nombre: 'IE 70002' })];
    expect(etiquetaDeInstitucion(lista[0], lista)).toBe('IE 70001');
  });

  /**
   * «COORDINACION DE PRONOEI - UGEL LAMPA» figura cinco veces, una por
   * distrito. Sin distinguirlas, elegir es adivinar.
   */
  it('agrega el distrito cuando el nombre se repite', () => {
    const lista = [
      ie({ id: 'a', nombre: 'PRONOEI', distrito: 'Palca' }),
      ie({ id: 'b', nombre: 'PRONOEI', distrito: 'Pucara' }),
    ];
    expect(etiquetaDeInstitucion(lista[0], lista)).toBe('PRONOEI — Palca');
  });

  /**
   * «CHILAHUITO» figura dos veces en el mismo distrito, una de Inicial y otra
   * de Secundaria: ahí el distrito no alcanza y hace falta el nivel.
   */
  it('agrega también el nivel cuando el distrito no alcanza', () => {
    const lista = [
      ie({ id: 'a', nombre: 'CHILAHUITO', distrito: 'Paratia', nivelEducativo: 'Inicial' }),
      ie({ id: 'b', nombre: 'CHILAHUITO', distrito: 'Paratia', nivelEducativo: 'Secundaria' }),
    ];
    expect(etiquetaDeInstitucion(lista[0], lista)).toBe('CHILAHUITO — Paratia · Inicial');
  });

  it('no agrega nada que no ayude a distinguir', () => {
    const lista = [ie({ id: 'a', nombre: 'IE 70001' })];
    expect(etiquetaDeInstitucion(lista[0], lista)).toBe('IE 70001');
  });

  it('funciona aunque falte el distrito', () => {
    const lista = [
      ie({ id: 'a', nombre: 'PRONOEI', distrito: undefined, nivelEducativo: 'Inicial' }),
      ie({ id: 'b', nombre: 'PRONOEI', distrito: undefined, nivelEducativo: 'Primaria' }),
    ];
    expect(etiquetaDeInstitucion(lista[0], lista)).toBe('PRONOEI — Inicial');
  });
});

describe('opcionesDeInstitucion', () => {
  it('el valor es el identificador, no el nombre', () => {
    const opciones = opcionesDeInstitucion([ie({ id: 'ie-7' })]);
    expect(opciones[0].value).toBe('ie-7');
  });

  /**
   * Cinco instituciones homónimas producían cinco opciones con el mismo valor
   * y la misma etiqueta: el selector no podía distinguirlas y elegir cualquiera
   * daba el mismo resultado.
   */
  it('las homónimas quedan con valores distintos y etiquetas distintas', () => {
    const opciones = opcionesDeInstitucion([
      ie({ id: 'a', nombre: 'PRONOEI', distrito: 'Palca' }),
      ie({ id: 'b', nombre: 'PRONOEI', distrito: 'Pucara' }),
    ]);

    expect(new Set(opciones.map((o) => o.value)).size).toBe(2);
    expect(new Set(opciones.map((o) => o.label)).size).toBe(2);
  });

  it('sin instituciones no ofrece nada', () => {
    expect(opcionesDeInstitucion([])).toEqual([]);
  });
});

describe('opcionesDeEspecialista', () => {
  it('el valor es el identificador y la etiqueta el nombre', () => {
    const opciones = opcionesDeEspecialista([{ id: 'esp-1', nombre: 'Ana Torres' }]);
    expect(opciones).toEqual([{ value: 'esp-1', label: 'Ana Torres' }]);
  });

  it('distingue a dos especialistas de igual nombre por su cargo', () => {
    const opciones = opcionesDeEspecialista([
      { id: 'a', nombre: 'Ana Torres', cargo: 'Especialista' },
      { id: 'b', nombre: 'Ana Torres', cargo: 'Jefe de Área' },
    ]);

    expect(new Set(opciones.map((o) => o.label)).size).toBe(2);
  });
});

describe('opcionesDeEvaluadorInterno', () => {
  const docente = (over: Partial<EvaluadorInterno> = {}): EvaluadorInterno => ({
    id: 'doc-1',
    personaId: 'per-1',
    nombres: 'Rosa',
    apellidos: 'Mamani',
    cargo: 'Director',
    ...over,
  });

  const especialistas = [
    { id: 'esp-1', personaId: 'per-1' },
    { id: 'esp-2', personaId: 'per-2' },
  ];

  /**
   * Quien dirige o coordina en una I.E. figura en las dos tablas, unidas por
   * `persona_id`. La visita referencia al especialista, no al docente, así que
   * el valor de la opción tiene que ser el identificador de especialista.
   * Antes el puente entre ambas tablas era el nombre completo.
   */
  it('el valor es el identificador de especialista, no el de docente', () => {
    const opciones = opcionesDeEvaluadorInterno([docente()], especialistas);
    expect(opciones).toEqual([{ value: 'esp-1', label: 'Rosa Mamani (Director)' }]);
  });

  it('resuelve a cada uno por su persona', () => {
    const lista = [docente(), docente({ id: 'doc-2', personaId: 'per-2', nombres: 'Luis' })];
    expect(opcionesDeEvaluadorInterno(lista, especialistas).map((o) => o.value)).toEqual([
      'esp-1',
      'esp-2',
    ]);
  });

  /**
   * Los 65 evaluadores de la base tienen ambos registros, pero uno recién
   * creado podría no tenerlo todavía. Ofrecerlo daría una visita imposible de
   * guardar; se omite.
   */
  it('omite a quien no tiene registro de especialista', () => {
    const sinEspecialista = docente({ id: 'doc-9', personaId: 'per-9' });
    expect(opcionesDeEvaluadorInterno([sinEspecialista], especialistas)).toEqual([]);
  });

  it('sin evaluadores no ofrece nada', () => {
    expect(opcionesDeEvaluadorInterno([], especialistas)).toEqual([]);
  });
});
