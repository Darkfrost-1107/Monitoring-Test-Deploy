import { describe, it, expect } from 'vitest';
import { MODALIDAD_NIVEL_MAP } from '@sistema-monitoreo/shared-contracts';
import type {
  IUgelDashboardDistrito,
  IUgelDashboardIeMapa,
} from '@sistema-monitoreo/shared-contracts';
import {
  ESTADOS_DEL_MAPA,
  COBERTURA_LEYENDA,
  SIN_FILTRO_DE_NIVEL,
  colorDeCobertura,
  coberturaSegunFiltro,
  coincideConFiltroDeNivel,
  conteoPorDistrito,
  conteoPorEstado,
  estadoDelMarcador,
  etiquetaDeNivel,
  institucionesVisibles,
  firmaDeCobertura,
  NOMBRE_DE_MODALIDAD,
  modalidadesDisponibles,
  nivelesDelFiltro,
  nivelesDisponibles,
  MODO_DISTRITAL,
  MODO_INSTITUCIONAL,
  TODOS,
  DISTRITOS_DE_LAMPA,
  extraerDistritos,
} from './vista-del-mapa';

/**
 * Lo que el mapa de Lampa decide antes de dibujar: qué color lleva cada
 * distrito, qué instituciones quedan a la vista y qué filtros tiene sentido
 * ofrecer. Vivía dentro de `LampaMap`, un componente de 358 líneas donde se
 * mezclaba con la geometría de la provincia y con la maquetación de la leyenda.
 */

const ie = (over: Partial<IUgelDashboardIeMapa> = {}): IUgelDashboardIeMapa => ({
  institucionId: 'ie-1',
  nombre: 'IE 70001',
  distrito: 'Lampa',
  nivelEducativo: 'Primaria',
  modalidad: 'EBR',
  latitud: -15.36,
  longitud: -70.37,
  estado: 'critico',
  ...over,
});

describe('colorDeCobertura', () => {
  it('usa los tres umbrales que anuncia la leyenda', () => {
    expect(colorDeCobertura(100)).toBe(COBERTURA_LEYENDA[0].color);
    expect(colorDeCobertura(75)).toBe(COBERTURA_LEYENDA[0].color);
    expect(colorDeCobertura(74)).toBe(COBERTURA_LEYENDA[1].color);
    expect(colorDeCobertura(40)).toBe(COBERTURA_LEYENDA[1].color);
    expect(colorDeCobertura(39)).toBe(COBERTURA_LEYENDA[2].color);
    expect(colorDeCobertura(0)).toBe(COBERTURA_LEYENDA[2].color);
  });

  /**
   * Un distrito sin datos y un distrito con 0% de cobertura no son lo mismo:
   * el primero no se midió, el segundo se midió y dio cero. La leyenda los
   * distingue y el color tiene que distinguirlos también.
   */
  it('distingue «sin registro» de cobertura cero', () => {
    expect(colorDeCobertura(null)).toBe(COBERTURA_LEYENDA[3].color);
    expect(colorDeCobertura(undefined)).toBe(COBERTURA_LEYENDA[3].color);
    expect(colorDeCobertura(0)).not.toBe(COBERTURA_LEYENDA[3].color);
  });
});

describe('estadoDelMarcador', () => {
  it('devuelve el color y la etiqueta de cada estado del semáforo', () => {
    expect(estadoDelMarcador('logroPrevisto')).toBe(ESTADOS_DEL_MAPA.logroPrevisto);
  });

  it('cae en «sin registro» ante un estado que no reconoce', () => {
    expect(estadoDelMarcador('inventado')).toBe(ESTADOS_DEL_MAPA.sinRegistro);
  });
});

/**
 * El filtro del mapa sólo ofrecía Inicial, Primaria y Secundaria, así que las
 * II.EE. de EBA, EBE y CEPTRO se veían en el mapa pero ningún botón las
 * alcanzaba. El nivel sólo se entiende dentro de su modalidad, por eso se elige
 * en cascada —modalidad y después nivel—, igual que al programar un cronograma.
 */
describe('modalidadesDisponibles', () => {
  it('ofrece sólo las modalidades que hay, en el orden del dominio', () => {
    const lista = [ie({ modalidad: 'CEPTRO' }), ie({ modalidad: 'EBA' }), ie({ modalidad: 'EBR' })];
    expect(modalidadesDisponibles(lista)).toEqual(['EBR', 'EBA', 'CEPTRO']);
  });

  it('no repite una modalidad', () => {
    expect(modalidadesDisponibles([ie(), ie({ institucionId: 'ie-2' })])).toEqual(['EBR']);
  });

  it('no pierde una modalidad que el dominio no conoce', () => {
    const lista = [ie({ modalidad: 'NUEVA' }), ie({ modalidad: 'EBR' })];
    expect(modalidadesDisponibles(lista)).toEqual(['EBR', 'NUEVA']);
  });

  it('es vacía sin instituciones', () => {
    expect(modalidadesDisponibles([])).toEqual([]);
  });

  /** Quien ve toda la provincia espera las cuatro modalidades aunque hoy falte alguna. */
  it('con «delDominio» ofrece las cuatro aunque falten datos, en su orden', () => {
    expect(modalidadesDisponibles([ie()], { delDominio: true })).toEqual([
      'EBR',
      'EBA',
      'EBE',
      'CEPTRO',
    ]);
  });

  it('con «delDominio» tampoco pierde una modalidad que el dominio no conoce', () => {
    expect(modalidadesDisponibles([ie({ modalidad: 'NUEVA' })], { delDominio: true })).toEqual([
      'EBR',
      'EBA',
      'EBE',
      'CEPTRO',
      'NUEVA',
    ]);
  });
});

describe('nivelesDisponibles', () => {
  const lista = [
    ie({ modalidad: 'EBR', nivelEducativo: 'Secundaria' }),
    ie({ modalidad: 'EBR', nivelEducativo: 'Inicial' }),
    ie({ modalidad: 'EBA', nivelEducativo: 'Avanzado' }),
    ie({ modalidad: 'EBA', nivelEducativo: 'Inicial-Intermedio' }),
    ie({ modalidad: 'EBE', nivelEducativo: 'CEBE' }),
  ];

  it('ofrece los niveles que hay en esa modalidad, en el orden del dominio', () => {
    expect(nivelesDisponibles(lista, 'EBR')).toEqual(['Inicial', 'Secundaria']);
    expect(nivelesDisponibles(lista, 'EBA')).toEqual(['Inicial-Intermedio', 'Avanzado']);
  });

  it('no mezcla niveles de otra modalidad', () => {
    expect(nivelesDisponibles(lista, 'EBE')).toEqual(['CEBE']);
  });

  it('es vacía para una modalidad sin instituciones', () => {
    expect(nivelesDisponibles(lista, 'CEPTRO')).toEqual([]);
  });

  it('conserva un nivel que el dominio no lista', () => {
    const conRaro = [...lista, ie({ modalidad: 'EBR', nivelEducativo: 'Otro' })];
    expect(nivelesDisponibles(conRaro, 'EBR')).toEqual(['Inicial', 'Secundaria', 'Otro']);
  });

  /**
   * EBE tiene dos niveles, CEBE y PRITE, pero hoy sólo hay II.EE. de CEBE: sin
   * la opción, PRITE no se ofrecía y parecía que EBE tenía uno solo.
   */
  describe('con «delDominio»', () => {
    const opciones = { delDominio: true };

    it('ofrece todos los niveles de la modalidad aunque falten datos', () => {
      expect(nivelesDisponibles(lista, 'EBE', opciones)).toEqual(['CEBE', 'PRITE']);
    });

    it('los ofrece en el orden del dominio, no en el de llegada', () => {
      expect(nivelesDisponibles(lista, 'EBA', opciones)).toEqual(['Inicial-Intermedio', 'Avanzado']);
      expect(nivelesDisponibles(lista, 'EBR', opciones)).toEqual(['Inicial', 'Primaria', 'Secundaria']);
    });

    it('ofrece los seis niveles de CEPTRO aunque sólo haya II.EE. de uno', () => {
      const soloTecnicoProductiva = [ie({ modalidad: 'CEPTRO', nivelEducativo: 'Técnico Productiva' })];
      expect(nivelesDisponibles(soloTecnicoProductiva, 'CEPTRO', opciones)).toHaveLength(6);
    });

    it('conserva un nivel que el dominio no lista, al final', () => {
      const conRaro = [...lista, ie({ modalidad: 'EBE', nivelEducativo: 'Otro' })];
      expect(nivelesDisponibles(conRaro, 'EBE', opciones)).toEqual(['CEBE', 'PRITE', 'Otro']);
    });

    it('para una modalidad que el dominio no conoce ofrece lo que hay', () => {
      const rara = [ie({ modalidad: 'NUEVA', nivelEducativo: 'X' })];
      expect(nivelesDisponibles(rara, 'NUEVA', opciones)).toEqual(['X']);
    });
  });

  /** Un especialista sólo recibe su nivel: ofrecerle los otros sería darle botones que vacían el mapa. */
  it('sin «delDominio» ofrece sólo lo que hay', () => {
    expect(nivelesDisponibles(lista, 'EBE')).toEqual(['CEBE']);
  });
});

describe('nivelesDelFiltro', () => {
  const variasModalidades = [
    ie({ modalidad: 'EBR', nivelEducativo: 'Primaria' }),
    ie({ modalidad: 'EBA', nivelEducativo: 'Avanzado' }),
  ];

  /** Con varias modalidades a la vista un nivel suelto no dice de cuál es: primero se elige la modalidad. */
  it('no ofrece niveles mientras haya varias modalidades y ninguna elegida', () => {
    expect(nivelesDelFiltro(variasModalidades, TODOS)).toEqual([]);
  });

  it('ofrece los niveles de la modalidad elegida', () => {
    expect(nivelesDelFiltro(variasModalidades, 'EBA')).toEqual(['Avanzado']);
  });

  /** Un especialista sólo recibe una modalidad: obligarlo a elegirla sería un clic de más. */
  it('con una sola modalidad ofrece sus niveles sin pedir que se elija', () => {
    const soloEbr = [
      ie({ nivelEducativo: 'Inicial' }),
      ie({ nivelEducativo: 'Primaria' }),
      ie({ nivelEducativo: 'Secundaria' }),
    ];
    expect(nivelesDelFiltro(soloEbr, TODOS)).toEqual(['Inicial', 'Primaria', 'Secundaria']);
  });

  it('es vacía sin instituciones', () => {
    expect(nivelesDelFiltro([], TODOS)).toEqual([]);
  });

  it('con «delDominio» ofrece los niveles completos de la modalidad elegida', () => {
    expect(nivelesDelFiltro(variasModalidades, 'EBE', { delDominio: true })).toEqual(['CEBE', 'PRITE']);
  });

  it('con «delDominio» sigue pidiendo elegir modalidad antes de ofrecer niveles', () => {
    expect(nivelesDelFiltro(variasModalidades, TODOS, { delDominio: true })).toEqual([]);
  });
});

describe('coincideConFiltroDeNivel', () => {
  const cetpro = ie({ modalidad: 'CEPTRO', nivelEducativo: 'Técnico Productiva' });
  const secundaria = ie({ modalidad: 'EBR', nivelEducativo: 'Secundaria' });

  it('sin filtro deja pasar todo', () => {
    expect(coincideConFiltroDeNivel(cetpro, SIN_FILTRO_DE_NIVEL)).toBe(true);
    expect(coincideConFiltroDeNivel(secundaria, SIN_FILTRO_DE_NIVEL)).toBe(true);
  });

  it('acota por modalidad', () => {
    const filtro = { modalidad: 'CEPTRO', nivel: TODOS };
    expect(coincideConFiltroDeNivel(cetpro, filtro)).toBe(true);
    expect(coincideConFiltroDeNivel(secundaria, filtro)).toBe(false);
  });

  it('acota por nivel dentro de la modalidad', () => {
    const filtro = { modalidad: 'EBR', nivel: 'Secundaria' };
    expect(coincideConFiltroDeNivel(secundaria, filtro)).toBe(true);
    expect(coincideConFiltroDeNivel(ie({ nivelEducativo: 'Primaria' }), filtro)).toBe(false);
  });

  it('el nivel elegido no arrastra a otra modalidad que lo nombre igual', () => {
    const filtro = { modalidad: 'EBR', nivel: 'Inicial' };
    expect(coincideConFiltroDeNivel(ie({ modalidad: 'EBA', nivelEducativo: 'Inicial' }), filtro)).toBe(
      false,
    );
  });
});

describe('NOMBRE_DE_MODALIDAD', () => {
  /** El botón dice «EBA»; el nombre completo va de ayuda. Una modalidad nueva sin nombre quedaría muda. */
  it('nombra cada modalidad del dominio', () => {
    for (const modalidad of Object.keys(MODALIDAD_NIVEL_MAP)) {
      expect(NOMBRE_DE_MODALIDAD[modalidad]).toBeTruthy();
    }
  });
});

describe('etiquetaDeNivel', () => {
  it('en EBR dice sólo el nivel, que es lo que siempre se mostró', () => {
    expect(etiquetaDeNivel(ie({ modalidad: 'EBR', nivelEducativo: 'Secundaria' }))).toBe('Secundaria');
  });

  /** «CEBE» a secas no dice a qué modalidad pertenece. */
  it('en las demás antepone la modalidad', () => {
    expect(etiquetaDeNivel(ie({ modalidad: 'EBE', nivelEducativo: 'CEBE' }))).toBe('EBE · CEBE');
  });
});

describe('institucionesVisibles', () => {
  const lista = [
    ie({ institucionId: 'a', distrito: 'Lampa', nivelEducativo: 'Primaria', estado: 'critico' }),
    ie({ institucionId: 'b', distrito: 'Paratía', nivelEducativo: 'Inicial', estado: 'enProceso' }),
    ie({ institucionId: 'c', distrito: 'Lampa', nivelEducativo: 'Inicial', estado: 'critico' }),
  ];

  it('las devuelve todas sin filtros', () => {
    expect(institucionesVisibles(lista, {})).toHaveLength(3);
  });

  it('acota por distrito ignorando tildes y mayúsculas', () => {
    const visibles = institucionesVisibles(lista, { distrito: 'paratia' });
    expect(visibles.map((i) => i.institucionId)).toEqual(['b']);
  });

  it('acota por nivel educativo', () => {
    const visibles = institucionesVisibles(lista, { nivel: 'Inicial' });
    expect(visibles.map((i) => i.institucionId)).toEqual(['b', 'c']);
  });

  it('acota por estado del semáforo', () => {
    const visibles = institucionesVisibles(lista, { estado: 'critico' });
    expect(visibles.map((i) => i.institucionId)).toEqual(['a', 'c']);
  });

  it('combina los tres filtros', () => {
    const visibles = institucionesVisibles(lista, {
      distrito: 'Lampa',
      nivel: 'Inicial',
      estado: 'critico',
    });
    expect(visibles.map((i) => i.institucionId)).toEqual(['c']);
  });

  it('acota por modalidad', () => {
    const conCetpro = [
      ...lista,
      ie({ institucionId: 'd', modalidad: 'CEPTRO', nivelEducativo: 'Técnico Productiva' }),
    ];
    expect(institucionesVisibles(conCetpro, { modalidad: 'CEPTRO' }).map((i) => i.institucionId)).toEqual([
      'd',
    ]);
  });

  it('combina modalidad y nivel', () => {
    const mezcla = [
      ie({ institucionId: 'ebr', modalidad: 'EBR', nivelEducativo: 'Inicial' }),
      ie({ institucionId: 'eba', modalidad: 'EBA', nivelEducativo: 'Inicial' }),
    ];
    const visibles = institucionesVisibles(mezcla, { modalidad: 'EBA', nivel: 'Inicial' });
    expect(visibles.map((i) => i.institucionId)).toEqual(['eba']);
  });

  it('«Todos» no filtra nada', () => {
    expect(institucionesVisibles(lista, { nivel: TODOS, estado: TODOS })).toHaveLength(3);
  });
});

/**
 * Los conteos de la leyenda dicen cuántas II.EE. hay en cada estado y en cada
 * distrito. Eran de toda la provincia aunque el mapa estuviera filtrado: con
 * EBA elegida se veían 4 puntos y la leyenda decía 177 «Sin registro».
 */
describe('conteoPorEstado', () => {
  const lista = [
    ie({ institucionId: 'a', distrito: 'Lampa', modalidad: 'EBR', nivelEducativo: 'Primaria', estado: 'critico' }),
    ie({ institucionId: 'b', distrito: 'Lampa', modalidad: 'EBR', nivelEducativo: 'Inicial', estado: 'critico' }),
    ie({ institucionId: 'c', distrito: 'Paratía', modalidad: 'EBA', nivelEducativo: 'Avanzado', estado: 'sinRegistro' }),
    ie({ institucionId: 'd', distrito: 'Paratía', modalidad: 'EBR', nivelEducativo: 'Primaria', estado: 'enProceso' }),
  ];

  it('cuenta las II.EE. de cada estado', () => {
    expect(conteoPorEstado(lista, {})).toEqual({ critico: 2, sinRegistro: 1, enProceso: 1 });
  });

  it('acota al distrito elegido, ignorando tildes y mayúsculas', () => {
    expect(conteoPorEstado(lista, { distrito: 'paratia' })).toEqual({ sinRegistro: 1, enProceso: 1 });
  });

  it('acota a la modalidad elegida', () => {
    expect(conteoPorEstado(lista, { modalidad: 'EBA' })).toEqual({ sinRegistro: 1 });
  });

  it('acota al nivel elegido dentro de la modalidad', () => {
    expect(conteoPorEstado(lista, { modalidad: 'EBR', nivel: 'Inicial' })).toEqual({ critico: 1 });
  });

  it('sin instituciones no hay nada que contar', () => {
    expect(conteoPorEstado([], {})).toEqual({});
  });
});

describe('conteoPorDistrito', () => {
  const lista = [
    ie({ institucionId: 'a', distrito: 'Lampa', modalidad: 'EBR', nivelEducativo: 'Primaria' }),
    ie({ institucionId: 'b', distrito: 'Lampa', modalidad: 'EBA', nivelEducativo: 'Avanzado' }),
    ie({ institucionId: 'c', distrito: 'Paratía', modalidad: 'EBR', nivelEducativo: 'Primaria' }),
  ];

  it('cuenta las II.EE. por distrito, con la clave en mayúsculas', () => {
    const conteo = conteoPorDistrito(lista, {});
    expect(conteo.get('LAMPA')).toBe(2);
    expect(conteo.get('PARATÍA')).toBe(1);
  });

  it('acota a la modalidad elegida', () => {
    const conteo = conteoPorDistrito(lista, { modalidad: 'EBA' });
    expect(conteo.get('LAMPA')).toBe(1);
    expect(conteo.has('PARATÍA')).toBe(false);
  });

  it('acota al nivel elegido', () => {
    const conteo = conteoPorDistrito(lista, { modalidad: 'EBR', nivel: 'Primaria' });
    expect([...conteo.entries()]).toEqual([
      ['LAMPA', 1],
      ['PARATÍA', 1],
    ]);
  });

  it('ignora las que no traen distrito', () => {
    const conteo = conteoPorDistrito([ie({ distrito: '' })], {});
    expect(conteo.size).toBe(0);
  });
});

/**
 * El Director UGEL ve la provincia pintada por cobertura de cada distrito. Sus
 * filtros de modalidad y nivel tienen que repintar los distritos, no sólo los
 * puntos: si no, elegir «EBA» dejaría los colores de toda la provincia.
 */
describe('coberturaSegunFiltro', () => {
  const fila = (
    modalidad: string,
    nivelEducativo: string,
    totalInstituciones: number,
    monitoreadas: number,
  ) => ({ modalidad, nivelEducativo, totalInstituciones, monitoreadas });

  const lampa: IUgelDashboardDistrito = {
    distrito: 'Lampa',
    totalInstituciones: 6,
    monitoreadas: 3,
    porcentajeCobertura: 50,
    nivelPromedio: 2.4,
    desglose: [
      fila('EBR', 'Inicial', 2, 1),
      fila('EBR', 'Primaria', 2, 2),
      fila('EBA', 'Inicial', 1, 0),
      fila('CEPTRO', 'Técnico Productiva', 1, 0),
    ],
  };
  const paratia: IUgelDashboardDistrito = {
    distrito: 'Paratía',
    totalInstituciones: 1,
    monitoreadas: 1,
    porcentajeCobertura: 100,
    nivelPromedio: 3,
    desglose: [fila('EBR', 'Primaria', 1, 1)],
  };

  it('sin filtro deja la cobertura como la calculó el backend', () => {
    expect(coberturaSegunFiltro([lampa, paratia], SIN_FILTRO_DE_NIVEL)).toEqual([lampa, paratia]);
  });

  it('con una modalidad suma sólo sus filas y recalcula el porcentaje', () => {
    const [resultado] = coberturaSegunFiltro([lampa], { modalidad: 'EBR', nivel: TODOS });

    expect(resultado).toEqual(
      expect.objectContaining({ totalInstituciones: 4, monitoreadas: 3, porcentajeCobertura: 75 }),
    );
  });

  it('con un nivel acota dentro de la modalidad', () => {
    const [resultado] = coberturaSegunFiltro([lampa], { modalidad: 'EBR', nivel: 'Inicial' });

    expect(resultado).toEqual(
      expect.objectContaining({ totalInstituciones: 2, monitoreadas: 1, porcentajeCobertura: 50 }),
    );
  });

  it('el nivel elegido no arrastra a otra modalidad que lo nombre igual', () => {
    const [resultado] = coberturaSegunFiltro([lampa], { modalidad: 'EBA', nivel: 'Inicial' });

    expect(resultado).toEqual(
      expect.objectContaining({ totalInstituciones: 1, monitoreadas: 0, porcentajeCobertura: 0 }),
    );
  });

  /** Un distrito sin II.EE. de esa modalidad no tiene 0 % de cobertura: no tiene qué cubrir. */
  it('deja fuera al distrito que no tiene II.EE. en el recorte', () => {
    const resultado = coberturaSegunFiltro([lampa, paratia], { modalidad: 'CEPTRO', nivel: TODOS });

    expect(resultado.map((d) => d.distrito)).toEqual(['Lampa']);
  });

  it('redondea igual que el backend', () => {
    const tercio: IUgelDashboardDistrito = {
      ...lampa,
      desglose: [fila('EBR', 'Primaria', 3, 1)],
    };
    const dosTercios: IUgelDashboardDistrito = {
      ...lampa,
      desglose: [fila('EBR', 'Primaria', 3, 2)],
    };

    const filtro = { modalidad: 'EBR', nivel: TODOS };
    expect(coberturaSegunFiltro([tercio], filtro)[0].porcentajeCobertura).toBe(33);
    expect(coberturaSegunFiltro([dosTercios], filtro)[0].porcentajeCobertura).toBe(67);
  });

  it('conserva el nombre del distrito y su nivel promedio', () => {
    const [resultado] = coberturaSegunFiltro([lampa], { modalidad: 'EBR', nivel: TODOS });

    expect(resultado.distrito).toBe('Lampa');
    expect(resultado.nivelPromedio).toBe(2.4);
  });

  it('no modifica lo que recibe', () => {
    const copia = structuredClone(lampa);

    coberturaSegunFiltro([lampa], { modalidad: 'EBR', nivel: 'Inicial' });

    expect(lampa).toEqual(copia);
  });

  it('tolera distritos sin desglose sin lanzar TypeError', () => {
    const sinDesglose = {
      distrito: 'Lampa',
      totalInstituciones: 10,
      monitoreadas: 5,
      porcentajeCobertura: 50,
      nivelPromedio: 2.5,
    } as unknown as IUgelDashboardDistrito;

    expect(() =>
      coberturaSegunFiltro([sinDesglose], { modalidad: 'EBR', nivel: 'Primaria' }),
    ).not.toThrow();

    const resultado = coberturaSegunFiltro([sinDesglose], { modalidad: 'EBR', nivel: 'Primaria' });
    expect(resultado).toEqual([sinDesglose]);
  });
});

describe('firmaDeCobertura', () => {
  /**
   * `onEachFeature` de react-leaflet sólo corre al crear la capa: los tooltips
   * conservan los porcentajes con los que se montó. El estilo sí se actualiza
   * —`updateGeoJSON` llama a `setStyle`—, de modo que sin esta firma en la
   * clave los colores dicen una cosa y el tooltip otra.
   */
  const cobertura = (over: Partial<IUgelDashboardDistrito> = {}): IUgelDashboardDistrito => ({
    distrito: 'Lampa',
    totalInstituciones: 5,
    monitoreadas: 2,
    porcentajeCobertura: 40,
    nivelPromedio: 3,
    desglose: [],
    ...over,
  });

  it('cambia cuando cambian los porcentajes', () => {
    expect(firmaDeCobertura([cobertura()])).not.toBe(
      firmaDeCobertura([cobertura({ porcentajeCobertura: 60, monitoreadas: 3 })]),
    );
  });

  it('no cambia cuando los datos son equivalentes', () => {
    expect(firmaDeCobertura([cobertura()])).toBe(firmaDeCobertura([cobertura()]));
  });

  it('distingue la lista vacía de la que ya tiene datos', () => {
    expect(firmaDeCobertura([])).not.toBe(
      firmaDeCobertura([cobertura({ porcentajeCobertura: 0, monitoreadas: 0 })]),
    );
  });
});

describe('constantes de la vista', () => {
  it('sin filtro, modalidad y nivel están en «Todos»', () => {
    expect(SIN_FILTRO_DE_NIVEL).toEqual({ modalidad: TODOS, nivel: TODOS });
  });

  it('los dos modos de vista tienen nombres distintos', () => {
    expect(MODO_DISTRITAL).not.toBe(MODO_INSTITUCIONAL);
  });

  it('incluye los 10 distritos oficiales de la provincia de Lampa', () => {
    expect(DISTRITOS_DE_LAMPA).toHaveLength(10);
    expect(DISTRITOS_DE_LAMPA).toContain('LAMPA');
    expect(DISTRITOS_DE_LAMPA).toContain('CABANILLA');
  });
});

describe('extraerDistritos', () => {
  it('extrae y ordena los distritos únicos de cobertura e instituciones', () => {
    const i1 = ie({ distrito: 'Paratía' });
    const i2 = ie({ distrito: 'Lampa' });
    const distritos = extraerDistritos([i1, i2]);
    expect(distritos).toEqual(['Lampa', 'Paratía']);
  });

  it('devuelve los distritos oficiales por defecto si no hay datos', () => {
    const distritos = extraerDistritos([]);
    expect(distritos).toEqual([...DISTRITOS_DE_LAMPA]);
  });
});
