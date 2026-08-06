import {
  MODALIDAD_NIVEL_MAP,
  ModalidadEducativa,
  NivelEducativoEBR,
  DocenteCargosRestrictivos,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Invariantes de la relación modalidad ↔ nivel educativo.
 *
 * Existe una regla de dominio que atraviesa backend y frontend: los cargos de
 * Coordinador Pedagógico y Jefe de Taller sólo pueden asignarse en **EBR,
 * nivel Secundaria**.
 *
 * Sin embargo, tanto `validateCargoRestrictivo` en el backend como el filtro de
 * submenús del sidebar comprueban ÚNICAMENTE el nivel, sin mirar la modalidad.
 * Eso es correcto, pero por una razón que no salta a la vista: el valor
 * `'Secundaria'` no aparece en ninguna modalidad distinta de EBR, de modo que
 * comprobar el nivel implica la modalidad.
 *
 * Esa implicación es la que estas pruebas protegen. Si alguna vez se añadiera un
 * nivel llamado 'Secundaria' a otra modalidad, ambas comprobaciones pasarían a
 * ser incorrectas en silencio y sin que ningún tipo lo señalara.
 */
describe('Invariantes de modalidad y nivel educativo', () => {
  describe('unicidad de los nombres de nivel', () => {
    it('ningún nivel pertenece a más de una modalidad', () => {
      const modalidadesPorNivel = new Map<string, string[]>();

      for (const [modalidad, niveles] of Object.entries(MODALIDAD_NIVEL_MAP)) {
        for (const nivel of niveles) {
          modalidadesPorNivel.set(nivel, [...(modalidadesPorNivel.get(nivel) ?? []), modalidad]);
        }
      }

      const compartidos = [...modalidadesPorNivel.entries()].filter(
        ([, modalidades]) => modalidades.length > 1,
      );

      expect(compartidos).toEqual([]);
    });

    it('Secundaria pertenece exclusivamente a EBR', () => {
      const modalidadesConSecundaria = Object.entries(MODALIDAD_NIVEL_MAP)
        .filter(([, niveles]) => niveles.includes(NivelEducativoEBR.SECUNDARIA))
        .map(([modalidad]) => modalidad);

      expect(modalidadesConSecundaria).toEqual([ModalidadEducativa.EBR]);
    });

    it('comprobar nivel Secundaria implica modalidad EBR', () => {
      // Enunciado explícito de la implicación de la que dependen
      // `validateCargoRestrictivo` y el filtro de submenús del sidebar.
      for (const [modalidad, niveles] of Object.entries(MODALIDAD_NIVEL_MAP)) {
        if (niveles.includes(NivelEducativoEBR.SECUNDARIA)) {
          expect(modalidad).toBe(ModalidadEducativa.EBR);
        }
      }
    });
  });

  describe('cobertura del mapa', () => {
    it('toda modalidad declarada tiene al menos un nivel', () => {
      for (const modalidad of Object.values(ModalidadEducativa)) {
        expect(MODALIDAD_NIVEL_MAP[modalidad]?.length).toBeGreaterThan(0);
      }
    });

    it('el mapa no declara modalidades fuera del catálogo', () => {
      const catalogo = Object.values(ModalidadEducativa) as string[];
      for (const modalidad of Object.keys(MODALIDAD_NIVEL_MAP)) {
        expect(catalogo).toContain(modalidad);
      }
    });
  });

  describe('cargos restringidos a Secundaria', () => {
    it('son exactamente Coordinador Pedagógico y Jefe de Taller', () => {
      // Si el catálogo creciera, hay que revisar `validateCargoRestrictivo` y el
      // filtro del sidebar, que los enumeran por separado.
      expect(Object.values(DocenteCargosRestrictivos)).toEqual([
        'Coordinador Pedagógico',
        'Jefe de Taller',
      ]);
    });
  });
});
