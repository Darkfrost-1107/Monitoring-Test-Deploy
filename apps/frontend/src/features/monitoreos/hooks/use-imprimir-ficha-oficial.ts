import { useState } from 'react';
import { toast } from 'sonner';
import { fichasApi } from '../api/fichas.api';

/** Cuánto vive la URL del PDF antes de revocarla de la memoria. */
const REVOCAR_URL_MS = 10_000;

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();

  setTimeout(() => {
    enlace.remove();
    URL.revokeObjectURL(url);
  }, REVOCAR_URL_MS);
}

/** Cómo saber de qué ficha se trata: quien llama la conoce por la visita, por la fila del listado… */
export type ObtenerIdDeFicha = () => Promise<string | null>;

/**
 * «Imprimir / PDF» de una ficha: descarga directamente el PDF oficial generado por el backend.
 *
 * En dispositivos móviles y PWAs (Android WebAPK / iOS), abrir `window.open` con un iframe
 * o URL blob genera pantallas `about:blank` y bloqueos de seguridad de Chromium.
 * La descarga directa vía `<a download>` delega la descarga al sistema operativo,
 * permitiendo abrir el documento con cualquier lector PDF nativo sin errores de visor.
 */
export function useImprimirFichaOficial() {
  const [generando, setGenerando] = useState(false);

  const imprimir = async (obtenerIdDeFicha: ObtenerIdDeFicha): Promise<void> => {
    if (generando) return;

    setGenerando(true);
    const toastId = toast.loading('Generando PDF oficial…');

    try {
      const fichaId = await obtenerIdDeFicha();
      if (!fichaId) throw new Error('La ficha todavía no está guardada.');

      const pdf = await fichasApi.descargarPdf(fichaId);
      const pdfBlob =
        pdf.type === 'application/pdf' ? pdf : new Blob([pdf], { type: 'application/pdf' });

      const nombreArchivo = `Ficha_Monitoreo_${fichaId.split('-')[0]}.pdf`;
      descargarBlob(pdfBlob, nombreArchivo);

      toast.success('PDF descargado correctamente.', { id: toastId });
    } catch (error) {
      toast.error(
        `No se pudo generar el PDF: ${error instanceof Error ? error.message : 'error desconocido'}`,
        { id: toastId },
      );
    } finally {
      setGenerando(false);
    }
  };

  return { imprimir, generando };
}

