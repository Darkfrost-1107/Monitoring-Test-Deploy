import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  puedeClonarLaDelDirector,
  puedeCopiarParaSuInstitucion,
  puedeGestionar,
  type AlcanceDeGestion,
  type PlantillaGestionable,
  type UsuarioDeGestion,
} from './permisos-plantilla';

/**
 * Pruebas de qué acciones se ofrecen sobre cada plantilla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estas condiciones se calculaban dentro del
 * `map` que dibuja las tarjetas, en expresiones de cinco términos sin nombre.
 */

const plantilla = (over: Partial<PlantillaGestionable> = {}): PlantillaGestionable => ({
  creadoPorRole: 'jefe_gestion',
  ...over,
});

const usuario = (over: Partial<UsuarioDeGestion> = {}): UsuarioDeGestion => ({
  id: 'u1',
  role: RoleCode.ESPECIALISTA,
  ...over,
});

const desdeUgel: AlcanceDeGestion = { isInstitution: false, isMonitorCampo: false };
const desdeIE: AlcanceDeGestion = { isInstitution: true, isMonitorCampo: true };
const directorEnIE: AlcanceDeGestion = { isInstitution: true, isMonitorCampo: false };

describe('puedeGestionar — desde la UGEL', () => {
  it('permite gestionar las plantillas de la UGEL', () => {
    expect(puedeGestionar(plantilla(), usuario(), desdeUgel)).toBe(true);
  });

  it('trata las antiguas sin autor como de la UGEL', () => {
    expect(puedeGestionar(plantilla({ creadoPorRole: undefined }), usuario(), desdeUgel)).toBe(true);
  });

  it('no permite gestionar las de una institución', () => {
    const deIE = plantilla({ creadoPorRole: 'director_ie', ieId: 'ie-1' });
    expect(puedeGestionar(deIE, usuario(), desdeUgel)).toBe(false);
  });
});

describe('puedeGestionar — desde una institución', () => {
  it('el director gestiona las plantillas de su institución', () => {
    const suya = plantilla({ creadoPorRole: 'director_ie', ieId: 'ie-1' });
    const director = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });

    expect(puedeGestionar(suya, director, directorEnIE)).toBe(true);
  });

  it('el director no gestiona las de otra institución', () => {
    const ajena = plantilla({ creadoPorRole: 'director_ie', ieId: 'ie-9' });
    const director = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });

    expect(puedeGestionar(ajena, director, directorEnIE)).toBe(false);
  });

  it('quien creó la plantilla la gestiona aunque no sea director', () => {
    const propia = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'u1', ieId: 'ie-1' });

    expect(puedeGestionar(propia, usuario({ institucion: 'ie-1' }), desdeIE)).toBe(true);
  });

  it('no gestiona la que creó otra persona', () => {
    const ajena = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'u9', ieId: 'ie-1' });

    expect(puedeGestionar(ajena, usuario({ institucion: 'ie-1' }), desdeIE)).toBe(false);
  });

  /**
   * Antes se comparaba `p.ieId === user?.institucion` sin exigir que hubiera
   * institución: con ambos indefinidos la comparación daba verdadero y bastaba
   * con haber creado la plantilla para gestionarla desde cualquier lado.
   */
  it('sin institución asignada no gestiona nada del lado de la I.E.', () => {
    const huerfana = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'u1' });

    expect(puedeGestionar(huerfana, usuario({ institucion: undefined }), desdeIE)).toBe(false);
  });

  it('desde la I.E. no se gestionan las de la UGEL', () => {
    expect(puedeGestionar(plantilla(), usuario({ institucion: 'ie-1' }), desdeIE)).toBe(false);
  });

  it('sin usuario no se gestiona nada', () => {
    expect(puedeGestionar(plantilla(), null, desdeUgel)).toBe(false);
  });
});

describe('puedeClonarLaDelDirector', () => {
  const monitor = (over: Partial<UsuarioDeGestion> = {}) =>
    usuario({ id: 'u1', institucion: 'ie-1', ...over });
  const delDirector = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'dir', ieId: 'ie-1' });

  it('el monitor de campo puede clonar la plantilla del director de su I.E.', () => {
    expect(puedeClonarLaDelDirector(delDirector, monitor(), desdeIE)).toBe(true);
  });

  it('no ofrece clonar la que él mismo creó: ésa ya la gestiona', () => {
    const propia = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'u1', ieId: 'ie-1' });

    expect(puedeClonarLaDelDirector(propia, monitor(), desdeIE)).toBe(false);
  });

  it('no puede clonar la de otra institución', () => {
    const ajena = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'dir', ieId: 'ie-9' });

    expect(puedeClonarLaDelDirector(ajena, monitor(), desdeIE)).toBe(false);
  });

  it('no aplica fuera del perfil de una institución', () => {
    expect(puedeClonarLaDelDirector(delDirector, monitor(), desdeUgel)).toBe(false);
  });

  it('sin institución asignada no aplica', () => {
    const huerfana = plantilla({ creadoPorRole: 'director_ie', creadoPorId: 'dir' });

    expect(puedeClonarLaDelDirector(huerfana, monitor({ institucion: undefined }), desdeIE)).toBe(
      false,
    );
  });
});

describe('puedeCopiarParaSuInstitucion', () => {
  /**
   * El catálogo de la UGEL es obligatorio: una institución monitorea con las
   * fichas oficiales y no necesita copiarlas para eso. Copiar sirve únicamente
   * para materializar una plantilla que la Jefatura ya aprobó.
   *
   * Antes bastaba con ser director, y el botón se ofrecía siempre: se pulsaba y
   * el servidor devolvía 403 porque exige el cupo. Un botón que promete lo que
   * el servidor rechaza es peor que no tenerlo.
   */
  const director = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });
  const oficialDocente = plantilla({ instrumento: 'DOCENTE' });
  const cupoDocente = [{ instrumento: 'DOCENTE' }];

  it('con un cupo libre del mismo instrumento, se ofrece copiar', () => {
    expect(puedeCopiarParaSuInstitucion(oficialDocente, director, cupoDocente)).toBe(true);
  });

  it('sin cupo no se ofrece, aunque sea el director', () => {
    expect(puedeCopiarParaSuInstitucion(oficialDocente, director, [])).toBe(false);
  });

  it('un cupo de otro instrumento no habilita esta ficha', () => {
    // Cada autorización se concedió para una ficha concreta, no para «una
    // plantilla cualquiera».
    expect(
      puedeCopiarParaSuInstitucion(oficialDocente, director, [{ instrumento: 'DOCENTE_EIB' }]),
    ).toBe(false);
  });

  it.each([
    ['el jefe de taller', RoleCode.JEFE_TALLER],
    ['el coordinador pedagógico', RoleCode.COORDINADOR_PEDAGOGICO],
  ])('%s también crea la plantilla que se aprobó para su cargo', (_caso, role) => {
    // No PIDEN —eso lo tramita el director por todos—, pero sí crean la suya.
    expect(
      puedeCopiarParaSuInstitucion(oficialDocente, usuario({ role, institucion: 'ie-1' }), cupoDocente),
    ).toBe(true);
  });

  it('no copia las que ya son de una institución', () => {
    const deIE = plantilla({ creadoPorRole: 'director_ie', ieId: 'ie-1', instrumento: 'DOCENTE' });

    expect(puedeCopiarParaSuInstitucion(deIE, director, cupoDocente)).toBe(false);
  });

  it('no aplica al personal de la UGEL', () => {
    // El especialista aplica las fichas oficiales; no crea las de una I.E.
    expect(puedeCopiarParaSuInstitucion(oficialDocente, usuario(), cupoDocente)).toBe(false);
  });
});
