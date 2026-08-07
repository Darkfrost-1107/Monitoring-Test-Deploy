import { describe, it, expect } from 'vitest';
import type {
  IUgelDashboardDistrito,
  IUgelDashboardIeMapa,
} from '@sistema-monitoreo/shared-contracts';
import {
  ESTADOS_DEL_MAPA,
  COBERTURA_LEYENDA,
  NIVELES_DEL_FILTRO,
  colorDeCobertura,
  estadoDelMarcador,
  hayVariosNiveles,
  institucionesVisibles,
  firmaDeCobertura,
  MODO_DISTRITAL,
  MODO_INSTITUCIONAL,
  TODOS,
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

describe('hayVariosNiveles', () => {
  /**
   * El especialista sólo recibe II.EE. de su nivel: ofrecerle el filtro sería
   * ofrecerle botones que dejan el mapa vacío.
   */
  it('es falso cuando todas las II.EE. son del mismo nivel', () => {
    expect(hayVariosNiveles([ie(), ie({ institucionId: 'ie-2' })])).toBe(false);
  });

  it('es verdadero cuando conviven dos niveles', () => {
    expect(hayVariosNiveles([ie(), ie({ nivelEducativo: 'Inicial' })])).toBe(true);
  });

  it('es falso sin instituciones', () => {
    expect(hayVariosNiveles([])).toBe(false);
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

  it('«Todos» no filtra nada', () => {
    expect(institucionesVisibles(lista, { nivel: TODOS, estado: TODOS })).toHaveLength(3);
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
  it('el filtro de nivel ofrece «Todos» y los tres niveles', () => {
    expect(NIVELES_DEL_FILTRO).toEqual([TODOS, 'Inicial', 'Primaria', 'Secundaria']);
  });

  it('los dos modos de vista tienen nombres distintos', () => {
    expect(MODO_DISTRITAL).not.toBe(MODO_INSTITUCIONAL);
  });
});
