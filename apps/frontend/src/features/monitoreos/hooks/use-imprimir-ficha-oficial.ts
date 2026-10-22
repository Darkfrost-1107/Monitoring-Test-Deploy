import { useState } from 'react';
import { toast } from 'sonner';
import { fichasApi } from '../api/fichas.api';

/** Cuánto vive la URL del PDF: lo bastante para que el visor lo cargue y se pueda reabrir. */
const VIDA_DE_LA_URL_MS = 60_000;

function descargar(url: string, nombre: string) {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

/** Cómo saber de qué ficha se trata: quien llama la conoce por la visita, por la fila del listado… */
export type ObtenerIdDeFicha = () => Promise<string | null>;

/**
 * «Imprimir / PDF» de una ficha: abre el PDF oficial que genera el backend.
 *
 * La ventana se abre en el instante del clic y recién después se espera al
 * servidor. Si se abriera al terminar, el navegador la tomaría por una ventana
 * emergente que nadie pidió y la bloquearía. Si aun así la bloquea, se descarga
 * el archivo, que no depende de ventanas.
 */
export function useImprimirFichaOficial() {
  const [generando, setGenerando] = useState(false);

  const imprimir = async (obtenerIdDeFicha: ObtenerIdDeFicha): Promise<void> => {
    if (generando) return;

    const ventana = window.open('', '_blank');
    setGenerando(true);

    try {
      const fichaId = await obtenerIdDeFicha();
      if (!fichaId) throw new Error('La ficha todavía no está guardada.');

      const pdf = await fichasApi.descargarPdf(fichaId);
      const pdfBlob =
        pdf.type === 'application/pdf' ? pdf : new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);

      if (ventana) ventana.location.href = url;
      else descargar(url, `Ficha_Monitoreo_${fichaId.split('-')[0]}.pdf`);

      setTimeout(() => URL.revokeObjectURL(url), VIDA_DE_LA_URL_MS);
    } catch (error) {
      ventana?.close();
      toast.error(
        `No se pudo generar el PDF: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
    } finally {
      setGenerando(false);
    }
  };

  return { imprimir, generando };
}
