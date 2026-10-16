/**
 * Compresión de imágenes de evidencia antes de subirlas.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivía en la cabecera de `LlenarFichaForm`,
 * un componente de 1.294 líneas, pese a no pintar nada: son fotografías
 * tomadas en el aula, que llegan al tamaño que da la cámara del teléfono y se
 * guardan como texto dentro de la ficha.
 */

/** Lado máximo, en píxeles, con que se guarda una evidencia. */
export const LIMITE_LADO_EVIDENCIA = 1024;

/** Mensaje cuando la imagen no se logra reducir. */
const NO_SE_PUDO_REDUCIR = 'No se pudo reducir la imagen.';

/** Calidad JPEG del resultado. */
const CALIDAD_JPEG = 0.7;

export interface Dimensiones {
  ancho: number;
  alto: number;
}

/**
 * Dimensiones de destino conservando la proporción.
 *
 * Sólo reduce: una imagen que ya entra en el límite se deja como está, porque
 * agrandarla no aportaría detalle y sí peso.
 */
export function calcularDimensiones(
  ancho: number,
  alto: number,
  maxAncho: number,
  maxAlto: number,
): Dimensiones {
  if (ancho > alto) {
    if (ancho > maxAncho) {
      return { ancho: maxAncho, alto: Math.round((alto * maxAncho) / ancho) };
    }
    return { ancho, alto };
  }

  if (alto > maxAlto) {
    return { ancho: Math.round((ancho * maxAlto) / alto), alto: maxAlto };
  }
  return { ancho, alto };
}

/**
 * Reduce la imagen y la devuelve como `data:` URL.
 *
 * Si la reducción falla, rechaza: NO devuelve el original. Una foto de celular pesa
 * de 2 a 6 MB (y más de 20 con 48 MP), y esta evidencia viaja como texto dentro del
 * JSON de «finalizar»; mandarla tal cual hace fallar la ficha entera con un 413,
 * que es peor que pedir otra foto. Quien llama debe avisar al usuario.
 */
export function comprimirImagen(
  archivo: File,
  maxAncho = LIMITE_LADO_EVIDENCIA,
  maxAlto = LIMITE_LADO_EVIDENCIA,
  calidad = CALIDAD_JPEG,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = (evento) => {
      const original = evento.target?.result as string;
      const imagen = new Image();

      imagen.onload = () => {
        const { ancho, alto } = calcularDimensiones(
          imagen.width,
          imagen.height,
          maxAncho,
          maxAlto,
        );

        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;

        const contexto = lienzo.getContext('2d');
        if (!contexto) {
          reject(new Error(NO_SE_PUDO_REDUCIR));
          return;
        }

        contexto.drawImage(imagen, 0, 0, ancho, alto);
        lienzo.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error(NO_SE_PUDO_REDUCIR));
              return;
            }
            const lectorComprimido = new FileReader();
            lectorComprimido.onloadend = () => resolve(lectorComprimido.result as string);
            lectorComprimido.readAsDataURL(blob);
          },
          'image/jpeg',
          calidad,
        );
      };

      imagen.onerror = () => reject(new Error('Error al cargar la imagen en memoria.'));
      imagen.src = original;
    };

    lector.onerror = () => reject(new Error('Error al leer el archivo.'));
    lector.readAsDataURL(archivo);
  });
}
