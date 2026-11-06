interface Entrada {
  tieneCapacidad: boolean;
  /** Registro de docente de quien mira la pantalla, si lo tiene. */
  miDocenteId?: string;
  docenteId: string;
  activo: boolean;
  /** La cuenta sigue con la clave inicial (DNI): restablecerla no cambiaría nada. */
  contrasenaInicial?: boolean;
}

/**
 * ¿Se ofrece "Restablecer contraseña" en esta fila?
 *
 * Sólo decide qué se muestra: el backend vuelve a verificar la capacidad, la
 * institución, que no sea uno mismo y que la clave no esté ya en su valor
 * inicial en cada petición.
 */
export const puedeRestablecerContrasena = ({
  tieneCapacidad,
  miDocenteId,
  docenteId,
  activo,
  contrasenaInicial,
}: Entrada): boolean =>
  tieneCapacidad && activo && docenteId !== miDocenteId && !contrasenaInicial;
