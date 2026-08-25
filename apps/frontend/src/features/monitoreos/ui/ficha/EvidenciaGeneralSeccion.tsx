import { toast } from 'sonner';
import { FileText, Eye, Upload, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { comprimirImagen } from '@/shared/lib/imagen';

/** Espacios de evidencia general de la ficha. */
const RANURAS = ['GENERAL_1', 'GENERAL_2', 'GENERAL_3'] as const;

interface EvidenciaGeneralSeccionProps {
  /** Todas las evidencias de la ficha; acá sólo se usan las generales. */
  evidencias: Record<string, string>;
  onCambiar: (siguientes: Record<string, string>) => void;
  onVerImagen: (url: string) => void;
  soloLectura: boolean;
}

const contarGenerales = (evidencias: Record<string, string>) =>
  Object.keys(evidencias).filter((clave) => clave.startsWith('GENERAL')).length;

/**
 * Fotografías de respaldo del monitoreo.
 *
 * La escritura del borrador la hace el contenedor con el estado completo. Antes
 * se armaba acá a mano y omitía las observaciones de ejes y el contexto de
 * aula, de modo que subir una evidencia los borraba del borrador local.
 */
export const EvidenciaGeneralSeccion = ({
  evidencias,
  onCambiar,
  onVerImagen,
  soloLectura,
}: EvidenciaGeneralSeccionProps) => {
  const cargadas = contarGenerales(evidencias);

  const quitar = (ranura: string) => {
    const siguientes = { ...evidencias };
    delete siguientes[ranura];
    onCambiar(siguientes);
  };

  const subir = async (ranura: string, archivo: File) => {
    try {
      onCambiar({ ...evidencias, [ranura]: await comprimirImagen(archivo) });
    } catch (error) {
      console.error('No se pudo procesar la imagen de evidencia:', error);
      toast.error('Error al procesar la imagen.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          Evidencia del Monitoreo
        </span>
        <span className="text-[10px] text-slate-400 font-semibold">
          {cargadas}/{RANURAS.length} imágenes
        </span>
      </div>

      <div className="mt-2 flex flex-row flex-wrap gap-2">
        {RANURAS.map((ranura, idx) => {
          const url = evidencias[ranura];

          if (url) {
            return (
              <div
                key={ranura}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 max-w-[400px]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-100 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Evidencia {idx + 1} Cargada</p>
                    <p className="text-[10px] text-slate-400 truncate w-40">
                      evidencia-monitoreo-{idx + 1}.png
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => onVerImagen(url)}>
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Button>
                  {!soloLectura && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                      onClick={() => quitar(ranura)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          if (soloLectura || cargadas >= RANURAS.length) return null;

          return (
            <label
              key={ranura}
              className="inline-flex items-center justify-center gap-2 w-full max-w-[240px] h-[40px] rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-500 font-bold cursor-pointer hover:border-primary hover:text-primary hover:bg-primary/3 transition-all duration-150"
            >
              <Upload className="h-4 w-4" />
              Subir evidencia {idx + 1}
              <input
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) void subir(ranura, archivo);
                }}
              />
            </label>
          );
        })}

        {soloLectura && cargadas === 0 && (
          <span className="text-[11px] text-slate-300 italic block">— Sin evidencias cargadas</span>
        )}
      </div>
    </div>
  );
};
