/**
 * Validación del enlace de la carpeta pedagógica.
 *
 * La carpeta pedagógica no guarda archivos. El docente publica su portafolio en
 * Google Drive y el sistema almacena únicamente la referencia, porque el
 * almacenamiento propio no da abasto para varios documentos por docente y por
 * año.
 *
 * Esa decisión traslada el problema: lo que se guarda es una URL que carga un
 * usuario y abre otro. Sin restricción de esquema y de host, el campo sería un
 * vector de redirección y de ejecución de script. Por eso la validación es
 * deliberadamente estrecha —lista blanca de hosts, `https` obligatorio— en
 * lugar de una comprobación genérica de «parece una URL».
 *
 * ── Lo que esta validación NO puede garantizar ──
 * Que el enlace apunte a la carpeta correcta, que exista, o que esté compartido
 * con permiso de lectura. Un enlace privado supera esta validación y falla
 * recién cuando el monitor intenta abrirlo. Eso se cubre con instrucciones en
 * la interfaz, no con código.
 */

/**
 * Hosts aceptados, en lista blanca y con coincidencia exacta.
 *
 * La coincidencia es exacta a propósito. Comparar por sufijo aceptaría
 * `drive.google.com.atacante.io`, y aceptar subdominios abriría cualquier
 * `*.drive.google.com` que Google no controle.
 */
export const HOSTS_DRIVE_PERMITIDOS = ['drive.google.com', 'docs.google.com'] as const;

/** Tope de caracteres del enlace. Cubre con holgura cualquier URL de Drive real. */
export const LARGO_MAXIMO_ENLACE = 2048;

/** Recorta los espacios de los extremos, que es lo que deja un copiar y pegar. */
export const normalizarEnlaceDrive = (valor: string): string => valor.trim();

/**
 * ¿Es un enlace de Google Drive utilizable?
 *
 * Se apoya en el parser de `URL` en lugar de una expresión regular: parsear es
 * lo que distingue el host real de un host aparente dentro de la ruta o de las
 * credenciales.
 */
export const esEnlaceDriveValido = (valor: string): boolean => {
  const enlace = normalizarEnlaceDrive(valor);
  if (enlace.length === 0 || enlace.length > LARGO_MAXIMO_ENLACE) return false;

  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;
  // Credenciales embebidas: sirven para disfrazar el destino ante quien lee la
  // barra de direcciones, y ninguna URL legítima de Drive las lleva.
  if (url.username !== '' || url.password !== '') return false;

  const host = url.hostname.toLowerCase();
  return (HOSTS_DRIVE_PERMITIDOS as readonly string[]).includes(host);
};
