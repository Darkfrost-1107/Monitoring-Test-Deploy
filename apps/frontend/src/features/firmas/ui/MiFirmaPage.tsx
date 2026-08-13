import { useState, useEffect } from 'react';
import { PenTool, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { UploadFirmaManager } from '../components/UploadFirmaManager';
import { firmasApi } from '@/shared/api/firmas.api';
import { requestBlob } from '@/shared/config/api';
import { toast } from 'sonner';

export function MiFirmaPage() {
  const [currentFirmaUrl, setCurrentFirmaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBlobUrl = async (url: string) => {
    if (!url) return null;
    try {
      const blob = await requestBlob(url);
      return URL.createObjectURL(blob);
    } catch {
      return url;
    }
  };

  useEffect(() => {
    const fetchFirma = async () => {
      try {
        const response = await firmasApi.getCurrentFirma();
        if (response.firmaUrl) {
          const blobUrl = await loadBlobUrl(response.firmaUrl);
          setCurrentFirmaUrl(blobUrl);
        }
      } catch {
        toast.error('No se pudo cargar la firma actual');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFirma();
  }, []);

  const handleSuccess = async (newUrl: string) => {
    const blobUrl = await loadBlobUrl(newUrl);
    setCurrentFirmaUrl(blobUrl);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi Firma"
        description="Configura la firma que usarás para firmar digitalmente las fichas de monitoreo."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <PenTool className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Estado de tu Firma</h3>
            </div>
            
            {isLoading ? (
              <div className="h-32 flex items-center justify-center text-gray-400">
                Cargando...
              </div>
            ) : currentFirmaUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-sm aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center p-4">
                  <img src={currentFirmaUrl} alt="Mi Firma" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                </div>
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Firma configurada y lista para usarse
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                <PenTool className="h-8 w-8 text-gray-400 mb-2" />
                <p className="font-medium">Aún no tienes una firma configurada</p>
                <p className="text-sm">Usa el panel de la derecha para dibujar o subir tu firma.</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex flex-col gap-2">
            <h4 className="font-semibold">Información Importante</h4>
            <p>
              Esta firma se utilizará exclusivamente para estampar los documentos oficiales (fichas de monitoreo) dentro de esta plataforma. Al registrarla, aceptas que sea utilizada como representación de tu conformidad en las visitas.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <UploadFirmaManager onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
