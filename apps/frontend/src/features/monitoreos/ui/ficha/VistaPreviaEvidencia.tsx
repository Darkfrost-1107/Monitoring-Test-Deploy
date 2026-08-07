import { FileText, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface VistaPreviaEvidenciaProps {
  /** URL de la imagen a mostrar. `null` mantiene el visor cerrado. */
  url: string | null;
  onCerrar: () => void;
}

/** Visor de una evidencia a tamaño completo, sobre el formulario. */
export const VistaPreviaEvidencia = ({ url, onCerrar }: VistaPreviaEvidenciaProps) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 h-9 w-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center transition-all z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Vista Previa de Evidencia
          </span>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50 flex items-center justify-center min-h-[300px]">
          <img
            src={url}
            alt="Vista previa de evidencia"
            className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 shadow-sm"
          />
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
          <Button onClick={onCerrar}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
};
