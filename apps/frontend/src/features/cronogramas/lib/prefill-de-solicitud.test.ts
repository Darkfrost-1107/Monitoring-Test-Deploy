import { describe, it, expect } from 'vitest';
import { prefillDeSolicitud, type CatalogosDePrefill } from './prefill-de-solicitud';

/**
 * La precarga del formulario cuando se entra desde «Atender» una solicitud de
 * visita. Vivía dentro de un efecto de `useProgramacionCronograma`, envuelto en
 * un `setTimeout(…, 0)`.
 */

const catalogos: CatalogosDePrefill = {
  instituciones: [
    { id: 'ie-1', modalidad: 'EBR', nivelEducativo: 'Primaria' },
    { id: 'ie-2', modalidad: 'EBA', nivelEducativo: 'Secundaria' },
  ],
  docentes: [{ id: 'doc-1' }, { id: 'doc-2' }],
};

describe('prefillDeSolicitud', () => {
  it('toma la institución de la solicitud con su modalidad y nivel', () => {
    const { campos } = prefillDeSolicitud({ institucionId: 'ie-2' }, catalogos);

    expect(campos).toMatchObject({
      institucionId: 'ie-2',
      modalidad: 'EBA',
      nivel: 'Secundaria',
      tipo: 'DOCENTE',
    });
  });

  it('precarga al docente cuando la solicitud lo indica', () => {
    const { campos } = prefillDeSolicitud(
      { institucionId: 'ie-1', docenteId: 'doc-2' },
      catalogos,
    );
    expect(campos.evaluadoId).toBe('doc-2');
  });

  it('sin docente en la solicitud deja el evaluado sin elegir', () => {
    const { campos } = prefillDeSolicitud({ institucionId: 'ie-1' }, catalogos);
    expect(campos.evaluadoId).toBeUndefined();
  });

  it('propone una fecha para la visita', () => {
    const { campos } = prefillDeSolicitud({ institucionId: 'ie-1' }, catalogos);
    expect(campos.fechaHora).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  /**
   * Una solicitud puede venir de una I.E. que el ámbito de quien programa no
   * alcanza. Antes el formulario se abría sin institución y sin decir por qué:
   * la cascada de modalidad y nivel quedaba vacía y al elegir modalidad se
   * perdía lo poco que había.
   */
  it('avisa cuando la institución de la solicitud no está a su alcance', () => {
    const { faltante } = prefillDeSolicitud({ institucionId: 'ie-ajena' }, catalogos);
    expect(faltante).toContain('institución');
  });

  it('avisa cuando el docente de la solicitud no está a su alcance', () => {
    const { faltante } = prefillDeSolicitud(
      { institucionId: 'ie-1', docenteId: 'doc-ajeno' },
      catalogos,
    );
    expect(faltante).toContain('docente');
  });

  it('no avisa nada cuando todo se resolvió', () => {
    const resuelto = prefillDeSolicitud({ institucionId: 'ie-1', docenteId: 'doc-1' }, catalogos);
    expect(resuelto.faltante).toBeNull();
  });

  it('con la institución fuera de alcance no precarga modalidad ni nivel', () => {
    const { campos } = prefillDeSolicitud({ institucionId: 'ie-ajena' }, catalogos);

    expect(campos.institucionId).toBeUndefined();
    expect(campos.modalidad).toBeUndefined();
    expect(campos.nivel).toBeUndefined();
  });
});
