import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { checkDirectorConflict, checkPersonaYaEsDirector } from './docente-shared.helper.js';

/**
 * Pruebas de los dos conflictos que impiden asignar un cargo de Director.
 *
 * Fase 6 de PLAN_REMEDIACION.md. El frontend bloqueaba desde siempre que una
 * misma persona quedara registrada como director en más de una institución
 * (`shared/constants/roleValidation.ts`), pero el backend sólo verificaba que
 * la institución no tuviera ya un director. Quien saltara el formulario y
 * llamara a la API directamente podía crear el segundo registro.
 *
 * Regla confirmada con el área: un director dirige un solo colegio.
 */

interface TxSimulada {
  docenteCargo: { findFirst: ReturnType<typeof jest.fn> };
}

const tx = (resultado: unknown): TxSimulada => ({
  docenteCargo: { findFirst: jest.fn(() => Promise.resolve(resultado)) },
});

/** `where` con el que se consultó, para comprobar el filtro sin tocar la base. */
const filtroUsado = (consulta: TxSimulada) =>
  (consulta.docenteCargo.findFirst.mock.calls[0] as [{ where: Record<string, unknown> }])[0]
    .where as {
    docenteId?: { not: string };
    cargo?: { nombre: string };
    fechaFin?: null;
    docente?: { personaId?: string };
  };

const directorActivo = (nombres = 'Ana', apellidos = 'Torres') => ({
  docente: { persona: { nombres, apellidos } },
});

describe('checkDirectorConflict', () => {
  it('no falla cuando la institución no tiene director', async () => {
    await expect(checkDirectorConflict(tx(null) as never, 'ie-1')).resolves.toBeUndefined();
  });

  it('rechaza cuando la institución ya tiene un director activo', async () => {
    await expect(checkDirectorConflict(tx(directorActivo()) as never, 'ie-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('nombra al director que ocupa el puesto, para que se sepa a quién reemplazar', async () => {
    await expect(
      checkDirectorConflict(tx(directorActivo('Luis', 'Quispe')) as never, 'ie-1'),
    ).rejects.toThrow(/Luis Quispe/);
  });

  it('excluye al propio docente al editarlo, para no chocar consigo mismo', async () => {
    const consulta = tx(null);
    await checkDirectorConflict(consulta as never, 'ie-1', 'doc-1');

    const where = filtroUsado(consulta);
    expect(where.docenteId).toEqual({ not: 'doc-1' });
  });
});

describe('checkPersonaYaEsDirector', () => {
  it('no falla cuando la persona no dirige ninguna institución', async () => {
    await expect(checkPersonaYaEsDirector(tx(null) as never, 'persona-1')).resolves.toBeUndefined();
  });

  /**
   * Éste es el caso que el backend dejaba pasar: la persona ya dirige otro
   * colegio, y la institución de destino todavía no tiene director, de modo que
   * `checkDirectorConflict` no encontraba nada.
   */
  it('rechaza cuando la persona ya dirige otra institución', async () => {
    const enOtraIe = {
      docente: {
        institucion: { nombre: 'IE 1234' },
        persona: { nombres: 'Ana', apellidos: 'Torres' },
      },
    };

    await expect(checkPersonaYaEsDirector(tx(enOtraIe) as never, 'persona-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('nombra la institución que ya dirige, para que se entienda el conflicto', async () => {
    const enOtraIe = {
      docente: {
        institucion: { nombre: 'IE 1234' },
        persona: { nombres: 'Ana', apellidos: 'Torres' },
      },
    };

    await expect(checkPersonaYaEsDirector(tx(enOtraIe) as never, 'persona-1')).rejects.toThrow(
      /IE 1234/,
    );
  });

  it('busca sólo cargos de Director vigentes', async () => {
    const consulta = tx(null);
    await checkPersonaYaEsDirector(consulta as never, 'persona-1');

    const where = filtroUsado(consulta);
    expect(where.cargo).toEqual({ nombre: 'Director' });
    expect(where.fechaFin).toBeNull();
    expect(where.docente?.personaId).toBe('persona-1');
  });

  it('excluye al propio docente al editarlo', async () => {
    const consulta = tx(null);
    await checkPersonaYaEsDirector(consulta as never, 'persona-1', 'doc-1');

    const where = filtroUsado(consulta);
    expect(where.docenteId).toEqual({ not: 'doc-1' });
  });
});
