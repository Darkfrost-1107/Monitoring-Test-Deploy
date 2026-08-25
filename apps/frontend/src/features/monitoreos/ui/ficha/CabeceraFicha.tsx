import { Sparkles, FileText, Download, X, Activity, FolderOpen } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Plantilla } from '@/entities/model-plantillas';

export type PestanaFicha = 'FICHA' | 'HISTORIAL' | 'CARPETA';

interface CabeceraFichaProps {
  template: Plantilla;
  soloLectura: boolean;
  /** Sin pestañas cuando la visita no tiene historial que mostrar. */
  pestana: PestanaFicha | null;
  onPestana: (pestana: PestanaFicha) => void;
  /**
   * Si se ofrece la carpeta pedagógica del docente evaluado.
   *
   * Depende de la capacidad de quien mira y de que la visita tenga evaluado:
   * ofrecer una pestaña que el backend va a rechazar es prometer algo que no se
   * puede cumplir.
   */
  conCarpeta: boolean;
  onImprimir: () => void;
  onCerrar: () => void;
}

const PESTANAS = [
  { clave: 'FICHA' as const, etiqueta: 'Rúbricas', Icono: FileText },
  { clave: 'HISTORIAL' as const, etiqueta: 'Historial', Icono: Activity },
];

const PESTANA_CARPETA = {
  clave: 'CARPETA' as const,
  etiqueta: 'Carpeta',
  Icono: FolderOpen,
};

/** Encabezado fijo ultra compacto: título + selector pill + acciones en 1 sola fila. */
export const CabeceraFicha = ({
  template,
  soloLectura,
  pestana,
  onPestana,
  conCarpeta,
  onImprimir,
  onCerrar,
}: CabeceraFichaProps) => (
  <div className="shrink-0 bg-white border-b border-border px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
    {/* Título del instrumento */}
    <div className="min-w-0 flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
            {template.tipoMonitoreo}
          </h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {template.anioAcademico}
          </span>
          {soloLectura && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Lectura
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Selector de pestañas tipo pill (en el centro) */}
    {pestana && (
      <div className="inline-flex p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
        {[...PESTANAS, ...(conCarpeta ? [PESTANA_CARPETA] : [])].map(({ clave, etiqueta, Icono }) => {
          const activa = pestana === clave;
          return (
            <button
              key={clave}
              type="button"
              onClick={() => onPestana(clave)}
              className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activa
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
              }`}
            >
              <Icono className="h-3.5 w-3.5" />
              <span>{etiqueta}</span>
            </button>
          );
        })}
      </div>
    )}

    {/* Botones de acción */}
    <div className="flex items-center gap-2 shrink-0">
      {soloLectura && (
        <Button
          variant="outline"
          size="sm"
          className="border-primary text-primary hover:bg-primary/5 text-xs font-bold gap-1.5 cursor-pointer shadow-xs h-7.5 px-2.5"
          onClick={onImprimir}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Imprimir / PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      )}
      <button
        onClick={onCerrar}
        aria-label="Cerrar modal"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>
);
