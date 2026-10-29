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
 * Sólo decide qué se muestra: el backend vuelve a verificar la capacidad, la
 * institución y que no sea uno mismo en cada petición.
 */
export const puedeRestablecerContrasena = ({
  tieneCapacidad,
  miDocenteId,
  docenteId,
  activo,
}: Entrada): boolean => tieneCapacidad && activo && docenteId !== miDocenteId;
