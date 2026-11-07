interface Entrada {
  tieneCapacidad: boolean;
  /** Registro de docente de quien mira la pantalla, si lo tiene. */
  miDocenteId?: string;
  docenteId: string;
  activo: boolean;
}

/**
 * ¿Se ofrece "Restablecer contraseña" en esta fila?
 *
 * Sólo decide si el botón se muestra en la fila: si está presente pero la contraseña
 * ya está en su valor inicial (DNI), se muestra deshabilitado en gris. El backend
 * vuelve a verificar la capacidad, la institución, que no sea uno mismo y que la
 * clave no esté ya en su valor inicial en cada petición.
 */
export const puedeRestablecerContrasena = ({
  tieneCapacidad,
  miDocenteId,
  docenteId,
  activo,
}: Entrada): boolean => tieneCapacidad && activo && docenteId !== miDocenteId;
