import {
  condicionDeFicha,
  debeFinalizarse,
  esArchivoDeFirma,
  resolverFicha,
  rolFirmanteDe,
  rutaDeImagenDeFirma,
  RUTA_DE_MI_FIRMA,
} from './firmas.helper.js';

/**
 * Pruebas de la autorización del módulo de firmas, que no tenía ninguna.
 *
 * El módulo entró sin cobertura: ni el controlador ni el almacenamiento tenían
 * pruebas, y la decisión de quién puede estampar su firma en una ficha oficial
 * vivía dentro del controlador junto a las consultas de Prisma.
 */

const partes = {
  evaluado: { personaId: 'persona-docente' },
  monitor: { personaId: 'persona-especialista' },
};

describe('rolFirmanteDe', () => {
  it('reconoce al evaluado de la visita', () => {
    expect(rolFirmanteDe('persona-docente', partes)).toBe('EVALUADO');
  });

  it('reconoce al monitor de la visita', () => {
    expect(rolFirmanteDe('persona-especialista', partes)).toBe('EVALUADOR');
  });

  /**
   * El caso que sostiene toda la regla: un tercero no firma la ficha de otros,
   * por más que esté autenticado y tenga su firma configurada.
   */
  it('rechaza a quien no es parte de la visita', () => {
    expect(rolFirmanteDe('persona-ajena', partes)).toBeNull();
  });

  it('rechaza a una persona sin identificador', () => {
    expect(rolFirmanteDe(null, partes)).toBeNull();
    expect(rolFirmanteDe(undefined, partes)).toBeNull();
    expect(rolFirmanteDe('', partes)).toBeNull();
  });

  /**
   * Dos ausencias no son una coincidencia. El esquema declara `personaId`
   * requerido en las tres tablas, así que hoy no se llega acá; se fija para que
   * un `null` futuro no se lea como «soy el evaluado».
   */
  it('no empareja dos identificadores ausentes', () => {
    expect(rolFirmanteDe(null, { evaluado: null, monitor: null })).toBeNull();
  });

  it('no empareja cuando falta la parte contra la que compara', () => {
    expect(rolFirmanteDe('persona-docente', { evaluado: null, monitor: null })).toBeNull();
  });

  /** El evaluado gana si la misma persona fuera las dos partes. */
  it('resuelve de forma estable si una persona fuera ambas partes', () => {
    const misma = { evaluado: { personaId: 'p' }, monitor: { personaId: 'p' } };

    expect(rolFirmanteDe('p', misma)).toBe('EVALUADO');
  });
});

/**
 * ── El defecto que estas pruebas fijan ──
 * Los endpoints aceptan el id de la ficha o el del cronograma, y la consulta
 * resolvía con `findFirst` sin orden. Mientras cada visita tenía una sola ficha
 * eso era inequívoco; desde que una visita docente puede llevar la ficha regular
 * Y la EIB, un `cronogramaId` corresponde a dos fichas y `findFirst` elegía una
 * arbitraria. Firmar es un acto sobre el contenido de un instrumento concreto.
 */
describe('condicionDeFicha', () => {
  it('acepta el id de la ficha o el del cronograma', () => {
    expect(condicionDeFicha('abc')).toEqual({
      OR: [{ id: 'abc' }, { cronogramaId: 'abc' }],
    });
  });

  /** `(cronogramaId, plantillaId)` es único en el esquema: identifica una sola. */
  it('fija el instrumento cuando se indica la plantilla', () => {
    expect(condicionDeFicha('crono-1', 'plantilla-eib')).toEqual({
      OR: [{ id: 'crono-1' }, { cronogramaId: 'crono-1', plantillaId: 'plantilla-eib' }],
    });
  });

  it('sigue resolviendo por id de ficha aunque se indique la plantilla', () => {
    const condicion = condicionDeFicha('ficha-1', 'plantilla-eib');

    expect(condicion.OR?.[0]).toEqual({ id: 'ficha-1' });
  });
});

describe('resolverFicha', () => {
  it('devuelve la ficha cuando hay exactamente una', () => {
    expect(resolverFicha([{ id: 'f-1' }])).toEqual({
      estado: 'unica',
      ficha: { id: 'f-1' },
    });
  });

  it('distingue que no hay ninguna', () => {
    expect(resolverFicha([])).toEqual({ estado: 'ninguna' });
  });

  /**
   * El caso que `findFirst` ocultaba: con dos fichas devolvía una fila y el
   * código seguía como si fuera la correcta. Ahora la ambigüedad es un estado
   * que el llamador tiene que atender.
   */
  it('declara la ambiguedad en vez de elegir una', () => {
    expect(resolverFicha([{ id: 'f-regular' }, { id: 'f-eib' }])).toEqual({
      estado: 'ambigua',
      cantidad: 2,
    });
  });

  it('informa cuantas encontro cuando es ambigua', () => {
    const resolucion = resolverFicha([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    expect(resolucion).toEqual({ estado: 'ambigua', cantidad: 3 });
  });
});

/**
 * ── Qué cierra una ficha ──
 * La regla era `count >= 2`: dos firmas cualesquiera la finalizaban. Funcionaba
 * porque el esquema sólo admitía EVALUADOR y EVALUADO, uno por ficha, así que
 * contar dos equivalía a «firmaron ambos».
 *
 * El director de la I.E. también firma la ficha docente, al final del monitoreo,
 * como visto bueno sobre una ficha YA finalizada. Con esa tercera firma, contar
 * dejaría de significar lo mismo: EVALUADOR + DIRECTOR sin el evaluado cerraría
 * la ficha sin que el docente la haya firmado. El código no impone ningún orden.
 *
 * Lo que cierra la ficha son las dos partes de la visita, no una cantidad.
 */
describe('debeFinalizarse', () => {
  it('cierra la ficha cuando firmaron el evaluador y el evaluado', () => {
    expect(debeFinalizarse(['EVALUADOR', 'EVALUADO'])).toBe(true);
  });

  it('no depende del orden en que firmaron', () => {
    expect(debeFinalizarse(['EVALUADO', 'EVALUADOR'])).toBe(true);
  });

  it('no cierra con una sola de las dos partes', () => {
    expect(debeFinalizarse(['EVALUADOR'])).toBe(false);
    expect(debeFinalizarse(['EVALUADO'])).toBe(false);
  });

  it('no cierra sin ninguna firma', () => {
    expect(debeFinalizarse([])).toBe(false);
  });

  /** El caso que la regla por cantidad iba a romper en cuanto exista DIRECTOR. */
  it('no cierra con el evaluador y el director si falta el evaluado', () => {
    expect(debeFinalizarse(['EVALUADOR', 'DIRECTOR'])).toBe(false);
  });

  it('sigue cerrando con las dos partes aunque el director ya haya firmado', () => {
    expect(debeFinalizarse(['EVALUADOR', 'EVALUADO', 'DIRECTOR'])).toBe(true);
  });

  it('tolera diferencias de caja en el rol guardado', () => {
    expect(debeFinalizarse(['evaluador', 'Evaluado'])).toBe(true);
  });
});

/**
 * La imagen de la firma no se sirve por su ruta en disco.
 *
 * `main.ts` publica `uploads/` con `express.static` sin autenticación: devolver
 * la ruta del archivo dejaba la firma manuscrita descargable por cualquiera que
 * conociera la URL.
 */
describe('rutaDeImagenDeFirma', () => {
  it('apunta al endpoint autenticado de la ficha, no al archivo', () => {
    expect(rutaDeImagenDeFirma('ficha-1', 'EVALUADO')).toBe(
      '/api/fichas/ficha-1/firmas/EVALUADO/imagen',
    );
  });

  it('nunca expone la carpeta publica', () => {
    expect(rutaDeImagenDeFirma('ficha-1', 'EVALUADOR')).not.toContain('/uploads');
    expect(RUTA_DE_MI_FIRMA).not.toContain('/uploads');
  });
});

/**
 * Las firmas ya guardadas están en `uploads/` con este nombre y seguirían siendo
 * descargables sin sesión, así que `main.ts` deja de publicarlas.
 */
describe('esArchivoDeFirma', () => {
  it('reconoce el nombre con el que se guardan las firmas', () => {
    expect(esArchivoDeFirma('/firma-2f1c4a9e-0b3d-4c8a-9f11-6d2e5a7b8c90.png')).toBe(true);
    expect(esArchivoDeFirma('firma-2f1c4a9e-0b3d-4c8a-9f11-6d2e5a7b8c90.png')).toBe(true);
  });

  it('no toca las evidencias ni los planes, que sí son de acceso directo', () => {
    expect(esArchivoDeFirma('/evidencias/foto-1.png')).toBe(false);
    expect(esArchivoDeFirma('/planes/plan-2026.pdf')).toBe(false);
    expect(esArchivoDeFirma('/reprogramaciones/solicitud.pdf')).toBe(false);
  });

  /** Un archivo dentro de un bucket no se confunde con una firma de la raíz. */
  it('no se deja enganar por un nombre parecido', () => {
    expect(esArchivoDeFirma('/firmado.png')).toBe(false);
    expect(esArchivoDeFirma('/firma-.png')).toBe(false);
    expect(esArchivoDeFirma('/firma-abc.jpg')).toBe(false);
  });
});
