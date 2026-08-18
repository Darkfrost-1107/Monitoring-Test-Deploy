import { describe, it, expect } from 'vitest';
import { hasPermission } from './roles';
import type { UserRole } from '@sistema-monitoreo/shared-contracts';

/**
 * Quién alcanza el Análisis de Desempeño.
 *
 * ── Por qué se fija con pruebas ──
 * El acceso vivía repartido en tres lugares que decían cosas distintas:
 * `ROLE_PERMISSIONS` concedía `reportes_analisis` al personal de la institución,
 * el menú lateral se lo ocultaba al colapsar «Reportes» en «Mis Reportes», y la
 * ruta se protegía con `reportes` —permiso base que hasta el docente tiene—, de
 * modo que se entraba escribiendo la URL.
 *
 * Ahora la ruta exige `reportes_analisis` y estas pruebas fijan a quién le
 * corresponde, que es una decisión de negocio y no un detalle de presentación.
 */

const CON_ACCESO: UserRole[] = [
  'director_ugel',
  'jefe_gestion',
  'jefe_area',
  'especialista',
  'director_institucion',
  'coordinador_pedagogico',
  'jefe_taller',
];

const SIN_ACCESO: UserRole[] = ['docente', 'superusuario'];

describe('acceso al Analisis de Desempeno', () => {
  it.each(CON_ACCESO)('%s puede verlo', (rol) => {
    expect(hasPermission(rol, 'reportes_analisis')).toBe(true);
  });

  /**
   * El docente es el evaluado: el análisis agrega resultados de varias personas
   * y no es algo que le corresponda mirar. Tiene «Mis Reportes» para los suyos.
   */
  it.each(SIN_ACCESO)('%s no puede verlo', (rol) => {
    expect(hasPermission(rol, 'reportes_analisis')).toBe(false);
  });

  /**
   * El docente conserva su bandeja: quitarle el análisis no debe dejarlo sin
   * acceso a sus propias fichas.
   */
  it('el docente conserva sus propios reportes', () => {
    expect(hasPermission('docente', 'reportes')).toBe(true);
    expect(hasPermission('docente', 'reportes_fichas')).toBe(true);
  });

  /**
   * El personal de la institución ve el analisis en una seccion propia, porque
   * su grupo «Reportes» se colapsa. Que tenga el permiso es la condicion.
   */
  it('el personal de la institucion tiene el permiso que habilita su seccion', () => {
    for (const rol of ['director_institucion', 'coordinador_pedagogico', 'jefe_taller'] as const) {
      expect(hasPermission(rol, 'reportes_analisis')).toBe(true);
    }
  });
});
