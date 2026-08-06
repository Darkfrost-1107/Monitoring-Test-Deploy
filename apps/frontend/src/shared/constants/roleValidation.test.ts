import { describe, it, expect } from 'vitest';
import { checkRoleConflict, type RolObjetivo } from './roleValidation';
import type { PersonaAutocompleteData, PersonaRoles } from '@features/docentes/hooks/useDniAutocomplete';

/**
 * Pruebas de caracterización de la verificación de conflictos de rol.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Es la lógica pura que comparten los cinco
 * formularios de alta —docentes, directores, especialistas, jefes de área e
 * instituciones—, y estaba en 0 %. Cubrirla vale más que renderizar los cinco:
 * es la regla que decide si una persona puede darse de alta con un rol nuevo.
 *
 * Distingue tres desenlaces, y la diferencia importa: **bloquear** impide
 * continuar, **advertir** deja seguir avisando de la consecuencia, y el silencio
 * permite el alta sin más. Ninguno estaba enunciado.
 */

const roles = (over: Partial<PersonaRoles> = {}): PersonaRoles =>
  ({
    esDirector: false,
    esDocente: false,
    esDocenteAula: false,
    esCoordinadorPedagogico: false,
    esJefeTaller: false,
    esEspecialista: false,
    especialistaCargoActivo: null,
    docenteCargosActivos: [],
    ...over,
  }) as PersonaRoles;

const persona = (over: Partial<PersonaRoles> = {}): PersonaAutocompleteData =>
  ({ roles: roles(over) }) as PersonaAutocompleteData;

/** Ninguno de los tres desenlaces: el alta procede sin aviso. */
const sinConflicto = { bloquea: false, advierte: false, mensaje: '' };

describe('checkRoleConflict', () => {
  it('no opina cuando aún no se identificó a la persona', () => {
    // El formulario llama en cada tecleo del DNI, antes de tener respuesta.
    expect(checkRoleConflict(null, 'docente')).toEqual(sinConflicto);
  });

  describe('alta como director de institución', () => {
    it('bloquea si la persona ya dirige una institución', () => {
      // Una persona no puede dirigir dos colegios a la vez.
      const r = checkRoleConflict(persona({ esDirector: true }), 'director');

      expect(r.bloquea).toBe(true);
      expect(r.advierte).toBe(false);
      expect(r.mensaje).toMatch(/ya está registrada como Director/i);
    });

    it.each([['esDocenteAula'], ['esCoordinadorPedagogico'], ['esJefeTaller']])(
      'advierte, sin bloquear, si ya es %s en otra institución',
      (rol) => {
        // El alta procede: la persona se traslada al nuevo colegio como
        // director. Se avisa porque deja su puesto anterior.
        const r = checkRoleConflict(persona({ [rol]: true }), 'director');

        expect(r.bloquea).toBe(false);
        expect(r.advierte).toBe(true);
        expect(r.detalle).toMatch(/trasladar/i);
      },
    );

    it('advierte si ya es especialista, porque sumará el cargo directivo', () => {
      const r = checkRoleConflict(
        persona({ esEspecialista: true, especialistaCargoActivo: 'Jefe de Área' }),
        'director',
      );

      expect(r.bloquea).toBe(false);
      expect(r.advierte).toBe(true);
      expect(r.mensaje).toContain('Jefe de Área');
    });

    it('permite el alta a una persona sin rol previo', () => {
      expect(checkRoleConflict(persona(), 'director')).toEqual(sinConflicto);
    });

    it('el bloqueo por dirección tiene prioridad sobre la advertencia por docencia', () => {
      // Quien ya es director Y docente de aula recibe el bloqueo, no el aviso.
      const r = checkRoleConflict(persona({ esDirector: true, esDocenteAula: true }), 'director');

      expect(r.bloquea).toBe(true);
    });
  });

  describe('alta como docente', () => {
    it('bloquea si la persona ya está registrada como docente', () => {
      const r = checkRoleConflict(persona({ esDocente: true }), 'docente');

      expect(r.bloquea).toBe(true);
      expect(r.mensaje).toMatch(/ya está registrada como docente/i);
    });

    it('enumera los cargos docentes vigentes en el mensaje', () => {
      const r = checkRoleConflict(
        persona({ esDocente: true, docenteCargosActivos: ['Docente de Aula', 'PIP'] }),
        'docente',
      );

      expect(r.mensaje).toContain('Docente de Aula, PIP');
    });

    it('usa un texto genérico si no hay cargos que enumerar', () => {
      const r = checkRoleConflict(
        persona({ esDocente: true, docenteCargosActivos: [] }),
        'docente',
      );

      expect(r.mensaje).toContain('docente');
    });

    it('advierte, sin bloquear, si es especialista: sumará el registro docente', () => {
      const r = checkRoleConflict(persona({ esEspecialista: true }), 'docente');

      expect(r.bloquea).toBe(false);
      expect(r.advierte).toBe(true);
      expect(r.detalle).toMatch(/Docente de Aula/i);
    });

    it('ser director no impide darse de alta como docente', () => {
      // Asimetría deliberada frente al caso anterior: un director puede
      // registrarse como docente, pero un docente no como director sin aviso.
      expect(checkRoleConflict(persona({ esDirector: true }), 'docente')).toEqual(sinConflicto);
    });
  });

  describe('alta como especialista, jefe de área o jefe de gestión', () => {
    const cargos: [RolObjetivo, string][] = [
      ['especialista', 'Especialista'],
      ['jefe_area', 'Jefe de Área'],
      ['jefe_gestion', 'Jefe de Gestión'],
    ];

    it.each(cargos)('bloquea a quien ya tiene el cargo %s', (rolObjetivo, cargo) => {
      const r = checkRoleConflict(
        persona({ esEspecialista: true, especialistaCargoActivo: cargo }),
        rolObjetivo,
        cargo,
      );

      expect(r.bloquea).toBe(true);
      expect(r.detalle).toMatch(/no se puede crear un nuevo registro/i);
    });

    it('bloquea a quien ya es especialista con OTRO cargo', () => {
      // Un especialista sólo puede tener un cargo activo a la vez, de modo que
      // el cambio de cargo no se hace desde el alta.
      const r = checkRoleConflict(
        persona({ esEspecialista: true, especialistaCargoActivo: 'Especialista' }),
        'jefe_area',
        'Jefe de Área',
      );

      expect(r.bloquea).toBe(true);
      expect(r.detalle).toMatch(/un cargo activo a la vez/i);
    });

    it('bloquea a cualquier especialista cuando no se indica cargo objetivo', () => {
      // Sin cargo con el que comparar, cualquier registro previo de
      // especialista basta para bloquear.
      const r = checkRoleConflict(persona({ esEspecialista: true }), 'especialista');

      expect(r.bloquea).toBe(true);
    });

    it.each([['esDocente'], ['esDirector'], ['esCoordinadorPedagogico'], ['esJefeTaller']])(
      'advierte, sin bloquear, si ya es %s',
      (rol) => {
        // La docencia y la especialidad conviven: se suma el registro.
        const r = checkRoleConflict(persona({ [rol]: true }), 'especialista', 'Especialista');

        expect(r.bloquea).toBe(false);
        expect(r.advierte).toBe(true);
        expect(r.detalle).toMatch(/Se creará además/i);
      },
    );

    it('ser docente de aula no basta para advertir', () => {
      // `esDocenteAula` no figura entre los que cuentan como docencia para esta
      // comprobación, a diferencia del alta como director. La asimetría es real.
      expect(checkRoleConflict(persona({ esDocenteAula: true }), 'especialista')).toEqual(
        sinConflicto,
      );
    });

    it('permite el alta a una persona sin rol previo', () => {
      expect(checkRoleConflict(persona(), 'jefe_gestion', 'Jefe de Gestión')).toEqual(
        sinConflicto,
      );
    });
  });

  describe('forma del resultado', () => {
    it('nunca bloquea y advierte a la vez', () => {
      // Los tres desenlaces son excluyentes: el formulario decide qué mostrar
      // en función de cuál llega.
      const casos: [PersonaAutocompleteData, RolObjetivo][] = [
        [persona({ esDirector: true }), 'director'],
        [persona({ esDocenteAula: true }), 'director'],
        [persona({ esDocente: true }), 'docente'],
        [persona({ esEspecialista: true }), 'especialista'],
        [persona({ esDirector: true }), 'especialista'],
      ];

      for (const [p, rol] of casos) {
        const r = checkRoleConflict(p, rol);
        expect(r.bloquea && r.advierte).toBe(false);
      }
    });

    it('todo desenlace que bloquea o advierte trae un mensaje', () => {
      const casos: [PersonaAutocompleteData, RolObjetivo][] = [
        [persona({ esDirector: true }), 'director'],
        [persona({ esDocente: true }), 'docente'],
        [persona({ esEspecialista: true }), 'jefe_area'],
      ];

      for (const [p, rol] of casos) {
        const r = checkRoleConflict(p, rol);
        expect(r.mensaje.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
