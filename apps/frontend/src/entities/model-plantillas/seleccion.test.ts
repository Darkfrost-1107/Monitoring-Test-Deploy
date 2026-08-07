import { describe, it, expect } from 'vitest';
import {
  TIPO_MONITOREO_POR_VISITA,
  seleccionarPlantillaActiva,
  type PlantillaSeleccionable,
  type ContextoSeleccion,
} from './seleccion';

/**
 * Pruebas de caracterización de la selección de plantilla vigente.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Esta cascada de prioridades vivía como un
 * `useMemo` de 42 líneas dentro de `CalendarioSidebar`. Decide con qué
 * instrumento se evalúa a un docente —qué preguntas se le hacen y cómo se
 * califica—, y no tenía una sola prueba.
 *
 * El orden de prioridades es el comportamiento de hoy, fijado tal cual.
 */

const plantilla = (over: Partial<PlantillaSeleccionable> = {}): PlantillaSeleccionable => ({
  id: 'p-generica',
  tipoMonitoreo: TIPO_MONITOREO_POR_VISITA.DOCENTE,
  estado: 'Vigente',
  ...over,
});

const contexto = (over: Partial<ContextoSeleccion> = {}): ContextoSeleccion => ({
  tipoVisita: 'DOCENTE',
  usuarioId: 'u-1',
  institucionUsuarioId: undefined,
  esInstitucion: false,
  esMonitorCampo: false,
  ...over,
});

describe('TIPO_MONITOREO_POR_VISITA', () => {
  it('traduce el tipo de visita al nombre del instrumento', () => {
    expect(TIPO_MONITOREO_POR_VISITA.DOCENTE).toBe('Monitoreo Docente');
    expect(TIPO_MONITOREO_POR_VISITA.DIRECTIVO).toBe('Monitoreo Directivo');
  });
});

describe('seleccionarPlantillaActiva — sin candidatas', () => {
  it('devuelve null con catálogo vacío', () => {
    expect(seleccionarPlantillaActiva([], contexto())).toBeNull();
  });
});

describe('seleccionarPlantillaActiva — prioridad 1: plantilla propia del evaluador', () => {
  it('prefiere la plantilla creada por el propio monitor de campo institucional', () => {
    const propia = plantilla({ id: 'p-propia', creadoPorRole: 'director_ie', ieId: 'ie-1', creadoPorId: 'u-1' });
    const deLaIe = plantilla({ id: 'p-ie', creadoPorRole: 'director_ie', ieId: 'ie-1', creadoPorId: 'otro' });
    const ugel = plantilla({ id: 'p-ugel', creadoPorRole: 'jefe_gestion' });

    const elegida = seleccionarPlantillaActiva(
      [ugel, deLaIe, propia],
      contexto({ institucionUsuarioId: 'ie-1', esInstitucion: true, esMonitorCampo: true }),
    );

    expect(elegida?.id).toBe('p-propia');
  });

  it('no aplica la prioridad propia si el usuario no es monitor de campo', () => {
    const propia = plantilla({ id: 'p-propia', creadoPorRole: 'director_ie', ieId: 'ie-1', creadoPorId: 'u-1' });
    const deLaIe = plantilla({ id: 'p-ie', creadoPorRole: 'director_ie', ieId: 'ie-1', creadoPorId: 'otro' });

    const elegida = seleccionarPlantillaActiva(
      [deLaIe, propia],
      contexto({ institucionUsuarioId: 'ie-1', esInstitucion: true, esMonitorCampo: false }),
    );

    expect(elegida?.id).toBe('p-ie');
  });
});

describe('seleccionarPlantillaActiva — prioridad 2: plantilla de la institución', () => {
  it('elige la plantilla de la I.E. del usuario', () => {
    const deLaIe = plantilla({ id: 'p-ie', creadoPorRole: 'director_ie', ieId: 'ie-1' });
    const ugel = plantilla({ id: 'p-ugel', creadoPorRole: 'jefe_gestion' });

    const elegida = seleccionarPlantillaActiva(
      [ugel, deLaIe],
      contexto({ institucionUsuarioId: 'ie-1', esInstitucion: true }),
    );

    expect(elegida?.id).toBe('p-ie');
  });

  it('ignora la plantilla de otra institución', () => {
    const deOtraIe = plantilla({ id: 'p-otra', creadoPorRole: 'director_ie', ieId: 'ie-9' });
    const ugel = plantilla({ id: 'p-ugel', creadoPorRole: 'jefe_gestion' });

    const elegida = seleccionarPlantillaActiva(
      [deOtraIe, ugel],
      contexto({ institucionUsuarioId: 'ie-1', esInstitucion: true }),
    );

    expect(elegida?.id).toBe('p-ugel');
  });

  it('no busca plantilla de I.E. para un usuario de la UGEL', () => {
    const deLaIe = plantilla({ id: 'p-ie', creadoPorRole: 'director_ie', ieId: 'ie-1' });
    const ugel = plantilla({ id: 'p-ugel', creadoPorRole: 'jefe_gestion' });

    const elegida = seleccionarPlantillaActiva(
      [deLaIe, ugel],
      contexto({ institucionUsuarioId: 'ie-1', esInstitucion: false }),
    );

    expect(elegida?.id).toBe('p-ugel');
  });
});

describe('seleccionarPlantillaActiva — prioridad 3: plantilla UGEL', () => {
  it('elige la creada por jefe de gestión', () => {
    const ugel = plantilla({ id: 'p-ugel', creadoPorRole: 'jefe_gestion' });
    expect(seleccionarPlantillaActiva([ugel], contexto())?.id).toBe('p-ugel');
  });

  it('trata la plantilla sin autor sellado como plantilla UGEL', () => {
    const sinAutor = plantilla({ id: 'p-legada', creadoPorRole: undefined });
    expect(seleccionarPlantillaActiva([sinAutor], contexto())?.id).toBe('p-legada');
  });
});

describe('seleccionarPlantillaActiva — filtros de tipo y estado', () => {
  it('descarta la plantilla de otro tipo de monitoreo', () => {
    const directivo = plantilla({ id: 'p-directivo', tipoMonitoreo: 'Monitoreo Directivo' });
    const docente = plantilla({ id: 'p-docente', tipoMonitoreo: 'Monitoreo Docente' });

    expect(seleccionarPlantillaActiva([directivo, docente], contexto({ tipoVisita: 'DOCENTE' }))?.id).toBe(
      'p-docente',
    );
    expect(
      seleccionarPlantillaActiva([docente, directivo], contexto({ tipoVisita: 'DIRECTIVO' }))?.id,
    ).toBe('p-directivo');
  });

  it('descarta las plantillas que no están vigentes', () => {
    const historica = plantilla({ id: 'p-historica', estado: 'Historico', creadoPorRole: 'jefe_gestion' });
    const vigente = plantilla({ id: 'p-vigente', estado: 'Vigente', creadoPorRole: 'jefe_gestion' });

    expect(seleccionarPlantillaActiva([historica, vigente], contexto())?.id).toBe('p-vigente');
  });
});

describe('seleccionarPlantillaActiva — último recurso', () => {
  /**
   * COMPORTAMIENTO FIJADO, no recomendado.
   *
   * Cuando ninguna prioridad acierta, la cascada cae a la primera plantilla del
   * catálogo — sin importar tipo ni estado. Puede devolver un instrumento de
   * otro tipo de monitoreo o uno en borrador. Se fija para que el refactor no lo
   * altere; corregirlo es un cambio de comportamiento aparte.
   */
  it('DEFECTO: cae a la primera del catálogo aunque no coincida en tipo ni estado', () => {
    const borradorDeOtroTipo = plantilla({
      id: 'p-cualquiera',
      tipoMonitoreo: 'Monitoreo Directivo',
      estado: 'Borrador',
    });

    const elegida = seleccionarPlantillaActiva([borradorDeOtroTipo], contexto({ tipoVisita: 'DOCENTE' }));

    expect(elegida?.id).toBe('p-cualquiera');
  });

  it('antes del último recurso prueba cualquier vigente del tipo pedido', () => {
    const ajena = plantilla({ id: 'p-ajena', creadoPorRole: 'director_ie', ieId: 'ie-9' });

    const elegida = seleccionarPlantillaActiva([ajena], contexto({ tipoVisita: 'DOCENTE' }));

    expect(elegida?.id).toBe('p-ajena');
  });
});
