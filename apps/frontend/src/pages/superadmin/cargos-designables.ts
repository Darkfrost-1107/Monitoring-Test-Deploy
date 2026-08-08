import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Los dos cargos de conducción de la UGEL que el superusuario designa.
 *
 * Estaban descritos por doce ternarios `targetRole === 'director_ugel' ? … : …`
 * repartidos entre `SuperadminPanel` y `SuperadminCreatePage`: títulos,
 * rótulos, rutas, colores, cargo y condición laboral, cada uno con su propia
 * copia de los literales de rol. Agregar un tercer cargo obligaba a encontrar
 * los doce.
 *
 * ── Cargo y rol no son lo mismo ──
 * El Director de UGEL se registra en el padrón con cargo «Especialista»: el
 * cargo describe su plaza y el rol, su función en el sistema. Por eso se
 * declaran por separado y no se deduce uno del otro.
 */

export type RolDesignable = typeof RoleCode.DIRECTOR_UGEL | typeof RoleCode.JEFE_GESTION;

export interface CargoDesignable {
  rol: RolDesignable;
  /** Cómo se lo nombra en prosa: «Designar al {nombre}». */
  nombre: string;
  /** Para títulos y encabezados, donde el nombre largo no entra. */
  nombreCorto: string;
  /** Rótulo del botón de la fila. */
  accionDesignar: string;
  /** Rótulo del botón que confirma en el diálogo. */
  confirmarDesignacion: string;
  /** Listado del cargo. */
  ruta: string;
  /** Alta de una persona nueva para el cargo. */
  rutaDeAlta: string;
  /** Cargo con el que se lo registra en el padrón de especialistas. */
  cargoEnElPadron: 'Especialista' | 'Jefe de Gestión';
  /** Condición laboral con la que se abre su formulario de alta. */
  condicionLaboral: 'Encargado' | 'Nombrado';
  /** Clases de la insignia que marca a quien ocupa el cargo. */
  insignia: string;
  /** Clases del botón cuando la fila es la persona designada. */
  botonDesignado: string;
}

export const CARGOS_DESIGNABLES: Record<RolDesignable, CargoDesignable> = {
  [RoleCode.DIRECTOR_UGEL]: {
    rol: RoleCode.DIRECTOR_UGEL,
    nombre: 'Director de la UGEL',
    nombreCorto: 'Director UGEL',
    accionDesignar: 'Designar Director',
    confirmarDesignacion: 'Sí, designar Director',
    ruta: '/superadmin/director',
    rutaDeAlta: '/superadmin/director/nuevo',
    cargoEnElPadron: 'Especialista',
    condicionLaboral: 'Encargado',
    insignia: 'bg-amber-50 text-amber-700 border-amber-200',
    botonDesignado: 'bg-amber-600 hover:bg-amber-700 text-white border-none',
  },
  [RoleCode.JEFE_GESTION]: {
    rol: RoleCode.JEFE_GESTION,
    nombre: 'Jefe de Gestión Pedagógica',
    nombreCorto: 'Jefe de Gestión',
    accionDesignar: 'Designar Jefe',
    confirmarDesignacion: 'Sí, designar Jefe',
    ruta: '/superadmin/jefe',
    rutaDeAlta: '/superadmin/jefe/nuevo',
    cargoEnElPadron: 'Jefe de Gestión',
    condicionLaboral: 'Nombrado',
    insignia: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    botonDesignado: 'bg-emerald-600 hover:bg-emerald-700 text-white border-none',
  },
};

export const cargoDesignable = (rol: RolDesignable): CargoDesignable => CARGOS_DESIGNABLES[rol];

/** El otro cargo de la dupla directiva. */
export const contraparteDe = (rol: RolDesignable): RolDesignable =>
  rol === RoleCode.DIRECTOR_UGEL ? RoleCode.JEFE_GESTION : RoleCode.DIRECTOR_UGEL;

/** ¿El rol es uno de los dos que este panel designa? */
export const esRolDesignable = (rol: string): rol is RolDesignable => rol in CARGOS_DESIGNABLES;
