import { describe, it, expect } from 'vitest';
import {
  plantillasAplicables,
  type ContextoAplicables,
  type PlantillaAplicable,
} from './aplicables';

/**
 * Pruebas del conjunto de instrumentos que se le ofrece al evaluador.
 *
 * El modal de «¿qué ficha aplicarás?» listaba toda plantilla vigente del tipo
 * pedido, sin mirar de quién era. En una UGEL con instituciones que clonan la
 * ficha oficial, eso le ponía enfrente a una especialista seis opciones —dos de
 * la UGEL y cuatro copias de una I.E. ajena— con rótulos idénticos.
 *
 * El daño no es visual. Elegir la copia de otra institución produce una ficha
 * evaluada con un instrumento que no corresponde, y nada en pantalla lo
 * delata: el nombre es el mismo.
 *
 * La regla que se fija acá es la misma que ya aplicaba la cascada de selección
 * automática, y por eso vive al lado: personal de UGEL evalúa con instrumentos
 * de UGEL, y personal de institución con los suyos o los de la UGEL. Los de
 * OTRA institución no se ofrecen nunca.
 */

const IE_PROPIA = 'ie-propia';
const IE_AJENA = 'ie-ajena';

const ANIO = 2026;

const plantilla = (over: Partial<PlantillaAplicable> = {}): PlantillaAplicable => ({
  id: 'p-1',
  instrumento: 'DOCENTE',
  estado: 'Vigente',
  anioAcademico: ANIO,
  ...over,
});

const contexto = (over: Partial<ContextoAplicables> = {}): ContextoAplicables => ({
  tipoVisita: 'DOCENTE',
  usuarioId: 'u-1',
  institucionUsuarioId: undefined,
  esInstitucion: false,
  esMonitorCampo: false,
  anioVisita: ANIO,
  ...over,
});

/** El catálogo real que devolvió la base: dos de UGEL y cuatro clones de una I.E. */
const CATALOGO: PlantillaAplicable[] = [
  plantilla({ id: 'ugel-docente', instrumento: 'DOCENTE', creadoPorRole: 'jefe_gestion' }),
  plantilla({ id: 'ugel-eib', instrumento: 'DOCENTE_EIB', creadoPorRole: 'jefe_gestion' }),
  plantilla({
    id: 'ie-docente-coord',
    instrumento: 'DOCENTE',
    creadoPorRole: 'coordinador_pedagogico',
    ieId: IE_AJENA,
  }),
  plantilla({
    id: 'ie-docente-dir',
    instrumento: 'DOCENTE',
    creadoPorRole: 'director_ie',
    ieId: IE_AJENA,
  }),
  plantilla({
    id: 'ie-eib-dir',
    instrumento: 'DOCENTE_EIB',
    creadoPorRole: 'director_ie',
    ieId: IE_AJENA,
  }),
  plantilla({
    id: 'ie-eib-taller',
    instrumento: 'DOCENTE_EIB',
    creadoPorRole: 'jefe_taller',
    ieId: IE_AJENA,
  }),
];

const idsDe = (ps: readonly PlantillaAplicable[]) => ps.map((p) => p.id);

describe('plantillasAplicables', () => {
  describe('personal de la UGEL', () => {
    it('sólo ofrece los instrumentos de la UGEL', () => {
      // El caso reportado: la especialista veía seis y debía ver dos.
      expect(idsDe(plantillasAplicables(CATALOGO, contexto()))).toEqual([
        'ugel-docente',
        'ugel-eib',
      ]);
    });

    it('ofrece los dos instrumentos de una visita docente: el regular y el EIB', () => {
      // Cuál de los dos corresponde lo decide el evaluador en el aula.
      const instrumentos = plantillasAplicables(CATALOGO, contexto()).map((p) => p.instrumento);
      expect(instrumentos).toEqual(['DOCENTE', 'DOCENTE_EIB']);
    });

    it('cuenta como de la UGEL una plantilla sin autor sellado', () => {
      // Las anteriores al sello de autor no tienen rol; excluirlas dejaría sin
      // instrumento a las visitas que hoy se evalúan con ellas.
      const vieja = plantilla({ id: 'sin-sello', creadoPorRole: undefined });
      expect(idsDe(plantillasAplicables([vieja], contexto()))).toEqual(['sin-sello']);
    });
  });

  describe('personal de una institución', () => {
    const enInstitucion = contexto({ esInstitucion: true, institucionUsuarioId: IE_PROPIA });

    it('ofrece la suya y las de la UGEL', () => {
      const propia = plantilla({
        id: 'ie-propia-doc',
        creadoPorRole: 'director_ie',
        ieId: IE_PROPIA,
        creadoPorId: 'u-1',
      });

      expect(idsDe(plantillasAplicables([...CATALOGO, propia], enInstitucion))).toEqual([
        'ugel-docente',
        'ugel-eib',
        'ie-propia-doc',
      ]);
    });

    /**
     * Una I.E. puede tener dos coordinadores pedagógicos o dos jefes de taller,
     * cada uno con su área y su criterio de observación, y cada ficha propia
     * nace de una solicitud aprobada para UNA persona. Ofrecer la del colega
     * hacía que el segundo evaluara con el instrumento que el primero diseñó
     * para otra realidad, y la ficha sale completa y firmada sin que nada lo
     * delate.
     */
    it('no ofrece la ficha de un colega de la misma institución', () => {
      const delColega = plantilla({
        id: 'ie-del-colega',
        creadoPorRole: 'coordinador_pedagogico',
        ieId: IE_PROPIA,
        creadoPorId: 'u-9',
      });

      expect(idsDe(plantillasAplicables([delColega], enInstitucion))).toEqual([]);
    });

    it('nunca ofrece las de otra institución', () => {
      // Es el error que no se ve: el rótulo de la copia ajena es idéntico.
      const ofrecidas = plantillasAplicables(CATALOGO, enInstitucion);
      expect(ofrecidas.every((p) => p.ieId === undefined)).toBe(true);
    });
  });

  describe('reglas comunes', () => {
    it('descarta lo que no está vigente', () => {
      const borrador = plantilla({ id: 'borrador', estado: 'Borrador' });
      const historica = plantilla({ id: 'historica', estado: 'Historico' });

      expect(plantillasAplicables([borrador, historica], contexto())).toEqual([]);
    });

    it('no ofrece instrumentos docentes en una visita directiva', () => {
      const directivo = plantilla({ id: 'ugel-directivo', instrumento: 'DIRECTIVO' });

      expect(
        idsDe(plantillasAplicables([...CATALOGO, directivo], contexto({ tipoVisita: 'DIRECTIVO' }))),
      ).toEqual(['ugel-directivo']);
    });

    it('no ofrece el instrumento directivo en una visita docente', () => {
      const directivo = plantilla({ id: 'ugel-directivo', instrumento: 'DIRECTIVO' });
      const ofrecidas = plantillasAplicables([...CATALOGO, directivo], contexto());

      expect(idsDe(ofrecidas)).not.toContain('ugel-directivo');
    });

    it('devuelve una lista vacía en vez de inventar un instrumento', () => {
      // Quedarse sin instrumento se ve y se corrige; una ficha levantada con el
      // instrumento equivocado, no.
      expect(plantillasAplicables([], contexto())).toEqual([]);
    });

    it('pone primero los de la UGEL, que son los que aplican por defecto', () => {
      const propia = plantilla({ id: 'ie-propia-doc', creadoPorRole: 'director_ie', ieId: IE_PROPIA });
      const ofrecidas = plantillasAplicables(
        [propia, ...CATALOGO],
        contexto({ esInstitucion: true, institucionUsuarioId: IE_PROPIA }),
      );

      expect(ofrecidas[0]?.id).toBe('ugel-docente');
    });
  });

  describe('ano academico', () => {
    /**
     * El sistema NO archiva las plantillas al cambiar de ano: `Historico`
     * significa «fue versionada, migre las respuestas», no «su ano termino».
     * Archivarlas en masa marcaria toda ficha del ano anterior como pendiente
     * de migrar, hacia una version que ya no existiria.
     *
     * De ahi que el corte sea por el ano de la VISITA y no por el calendario.
     */
    const DEL_ANIO = plantilla({ id: 'docente-2026', anioAcademico: 2026 });
    const DEL_SIGUIENTE = plantilla({ id: 'docente-2027', anioAcademico: 2027 });
    const DEL_ANTERIOR = plantilla({ id: 'docente-2025', anioAcademico: 2025 });

    it('ofrece solo el instrumento del ano de la visita', () => {
      const ofrecidas = plantillasAplicables(
        [DEL_ANTERIOR, DEL_ANIO, DEL_SIGUIENTE],
        contexto({ anioVisita: 2026 }),
      );

      expect(idsDe(ofrecidas)).toEqual(['docente-2026']);
    });

    it('una visita vieja que se llena tarde conserva el instrumento de SU ano', () => {
      // Caso real: la visita es de 2026 y se completa en febrero de 2027. Debe
      // evaluarse con el instrumento de 2026, no con el del calendario actual.
      const ofrecidas = plantillasAplicables([DEL_ANIO, DEL_SIGUIENTE], contexto({ anioVisita: 2026 }));

      expect(idsDe(ofrecidas)).toEqual(['docente-2026']);
    });

    it('deja la lista vacia si no hay instrumento del ano de la visita', () => {
      // Decision del usuario (2026-08-25): sin plantilla del ano no hay
      // monitoreo. Publicarla es tarea de la Jefatura de Gestion, y la pantalla
      // se lo dice al evaluador con el ano concreto.
      expect(plantillasAplicables([DEL_ANIO], contexto({ anioVisita: 2027 }))).toEqual([]);
    });

    it('no confunde el ano con el ambito', () => {
      // Una copia de la propia institucion del ano equivocado tampoco sirve.
      const clonViejo = plantilla({
        id: 'clon-2025',
        anioAcademico: 2025,
        creadoPorRole: 'director_ie',
        ieId: IE_PROPIA,
      });

      const ofrecidas = plantillasAplicables(
        [clonViejo, DEL_ANIO],
        contexto({ anioVisita: 2026, esInstitucion: true, institucionUsuarioId: IE_PROPIA }),
      );

      expect(idsDe(ofrecidas)).toEqual(['docente-2026']);
    });
  });

  describe('autorizacion', () => {
    /**
     * El catálogo de la UGEL es obligatorio. Una plantilla propia sólo se
     * ofrece si la Jefatura aprobó la solicitud que la creó.
     *
     * Las de institución anteriores a que las autorizaciones existieran dejan
     * de ofrecerse, pero NO se archivan: sus fichas ya cerradas siguen legibles
     * y los reportes quedan intactos. Archivarlas habría puesto un aviso de
     * «migre las respuestas» sobre fichas que no necesitan nada.
     */
    const enInstitucion = contexto({ esInstitucion: true, institucionUsuarioId: IE_PROPIA });

    it('no ofrece una plantilla propia sin autorizacion', () => {
      const vieja = plantilla({
        id: 'clon-viejo',
        creadoPorRole: 'director_ie',
        ieId: IE_PROPIA,
        autorizada: false,
      });

      expect(idsDe(plantillasAplicables([vieja], enInstitucion))).toEqual([]);
    });

    it('ofrece la propia que si nacio de una solicitud aprobada', () => {
      const conCupo = plantilla({
        id: 'clon-autorizado',
        creadoPorRole: 'director_ie',
        ieId: IE_PROPIA,
        creadoPorId: 'u-1',
        autorizada: true,
      });

      expect(idsDe(plantillasAplicables([conCupo], enInstitucion))).toEqual(['clon-autorizado']);
    });

    it('las de la UGEL no dependen de autorizacion alguna', () => {
      const oficial = plantilla({ id: 'ugel', creadoPorRole: 'jefe_gestion', autorizada: true });

      expect(idsDe(plantillasAplicables([oficial], enInstitucion))).toEqual(['ugel']);
    });

    it('sin el dato se trata como autorizada, para no dejar sin instrumento', () => {
      // El backend podría no rotularla todavía; quedarse sin ficha con la que
      // monitorear es peor que ofrecer una de más.
      const sinRotular = plantilla({ id: 'sin-rotular', creadoPorRole: 'jefe_gestion' });

      expect(idsDe(plantillasAplicables([sinRotular], enInstitucion))).toEqual(['sin-rotular']);
    });
  });
});
