import * as fs from 'fs/promises';
import * as path from 'path';

const TIPOS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
};

/**
 * Convierte la referencia a una imagen guardada en un data URI incrustable.
 *
 * Gotenberg arma el PDF sin sesión: no puede pedirle al servidor un archivo
 * privado, así que la imagen viaja dentro del HTML. Acepta un data URI (las
 * fotos de evidencia antiguas se guardaron como texto) y una ruta `/uploads/…`.
 *
 * La ruta sale de la base y no del cliente, pero se resuelve sólo por el nombre
 * del archivo contra `uploads/`, igual que el controlador de firmas: una ruta
 * con `..` en la fila no puede leer nada fuera de ese directorio. Cualquier otra
 * cosa, incluidas las URL externas, devuelve null: una imagen que falta no debe
 * impedir generar el documento.
 */
export async function resolverImagenEmbebida(
  referencia: string | null | undefined,
  raiz: string = process.cwd(),
): Promise<string | null> {
  if (!referencia) return null;
  if (referencia.startsWith('data:image/')) return referencia;
  if (!referencia.startsWith('/uploads/')) return null;

  const directorio = path.resolve(raiz, 'uploads');
  const archivo = path.resolve(directorio, path.basename(referencia));
  if (!archivo.startsWith(directorio + path.sep)) return null;

  try {
    const bytes = await fs.readFile(archivo);
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] ?? 'image/png';
    return `data:${tipo};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}
