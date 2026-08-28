import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { assertPuedeAplicarPlantilla, puedeAplicarPlantilla } from './plantilla-aplicable.guard.js';

/**
 * Con qué instrumento puede levantar la ficha cada persona.
 *
 * Las de la UGEL son el catálogo obligatorio y las aplica cualquiera. Una ficha
 * de institución nació de una solicitud aprobada para UNA persona: una I.E.
 * puede tener dos coordinadores pedagógicos con áreas y criterios distintos, y
 * compartir el instrumento haría que el segundo evaluara con las preguntas que
 * el primero diseñó para otra realidad.
 */

const coordinadora = {
  id: 'u-coord',
  role: RoleCode.COORDINADOR_PEDAGOGICO,
  institucionId: 'ie-1',
};

const otraCoordinadora = {
  id: 'u-coord-2',
  role: RoleCode.COORDINADOR_PEDAGOGICO,
  institucionId: 'ie-1',
};

const deLaUgel = { institucionId: null, autorId: 'u-jefe' };
const suPropia = { institucionId: 'ie-1', autorId: 'u-coord' };

describe('puedeAplicarPlantilla', () => {
  it('cualquiera aplica las fichas de la UGEL', () => {
    expect(puedeAplicarPlantilla(deLaUgel, coordinadora)).toBe(true);
  });

  it('cada quien aplica la ficha que le aprobaron', () => {
    expect(puedeAplicarPlantilla(suPropia, coordinadora)).toBe(true);
  });

  /** El caso que trae la regla: dos coordinadoras en la misma institución. */
  it('otra persona del mismo cargo y la misma I.E. no la aplica', () => {
    expect(puedeAplicarPlantilla(suPropia, otraCoordinadora)).toBe(false);
  });

  it('el director tampoco aplica la ficha de su coordinadora', () => {
    const director = { id: 'u-dir', role: RoleCode.DIRECTOR_INSTITUCION, institucionId: 'ie-1' };

    expect(puedeAplicarPlantilla(suPropia, director)).toBe(false);
  });

  it('nadie de otra institución la aplica', () => {
    const ajeno = { id: 'u-x', role: RoleCode.COORDINADOR_PEDAGOGICO, institucionId: 'ie-9' };

    expect(puedeAplicarPlantilla(suPropia, ajeno)).toBe(false);
  });

  /**
   * El especialista de UGEL no tiene institución y monitorea con el catálogo
   * oficial: nunca debe entrar en la ficha propia de una I.E.
   */
  it('el especialista de UGEL aplica las oficiales y no las de una I.E.', () => {
    const especialista = { id: 'u-esp', role: RoleCode.ESPECIALISTA };

    expect(puedeAplicarPlantilla(deLaUgel, especialista)).toBe(true);
    expect(puedeAplicarPlantilla(suPropia, especialista)).toBe(false);
  });
});

describe('assertPuedeAplicarPlantilla', () => {
  it('deja pasar sin lanzar cuando la ficha es aplicable', () => {
    expect(() => assertPuedeAplicarPlantilla(suPropia, coordinadora)).not.toThrow();
  });

  it('lanza 403 cuando la ficha es de otra persona', () => {
    expect(() => assertPuedeAplicarPlantilla(suPropia, otraCoordinadora)).toThrow(
      ForbiddenException,
    );
  });

  /** El mensaje dice qué SÍ puede hacer, no sólo que no puede. */
  it('el motivo nombra la salida: las fichas de la UGEL', () => {
    try {
      assertPuedeAplicarPlantilla(suPropia, otraCoordinadora);
      throw new Error('debió lanzar');
    } catch (error) {
      expect((error as ForbiddenException).message).toContain('UGEL');
    }
  });
});
