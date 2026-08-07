import { Sparkles, FileText, Download, X, Activity } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { Plantilla } from '@/entities/model-plantillas';
import { formatearFechaVisita, formatearHoraVisita } from '@/shared/lib/fecha-visita';

export type PestanaFicha = 'FICHA' | 'HISTORIAL';

interface CabeceraFichaProps {
  visit: Cronograma;
  template: Plantilla;
  soloLectura: boolean;
  /** Sin pestañas cuando la visita no tiene historial que mostrar. */
  pestana: PestanaFicha | null;
  onPestana: (pestana: PestanaFicha) => void;
  onImprimir: () => void;
  onCerrar: () => void;
}

const PESTANAS = [
  { clave: 'FICHA' as const, etiqueta: 'Rúbricas de Ficha', Icono: FileText },
  { clave: 'HISTORIAL' as const, etiqueta: 'Historial Pedagógico', Icono: Activity },
];

/** Encabezado del formulario: qué instrumento, sobre quién y en qué visita. */
export const CabeceraFicha = ({
  visit,
  template,
  soloLectura,
  pestana,
  onPestana,
  onImprimir,
  onCerrar,
}: CabeceraFichaProps) => (
  <>
    <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Ejecución de Ficha de Monitoreo {soloLectura && '(Lectura)'}
        </span>
        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {template.tipoMonitoreo} ({template.anioAcademico})
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {soloLectura && (
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary/5 text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            onClick={onImprimir}
          >
            <Download className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        )}
        <button
          onClick={onCerrar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>

    <div className="px-6 py-3 bg-primary-light border-b border-primary/5 text-xs text-slate-600 font-bold grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        Institución: <span className="text-slate-800">{visit.institucion}</span>
      </div>
      <div>
        Evaluado: <span className="text-slate-800">{visit.docenteDirectivo}</span>
      </div>
      <div>
        Especialista: <span className="text-slate-800">{visit.especialista}</span>
      </div>
      <div>
        Fecha Programada:{' '}
        <span className="text-slate-800">
          {formatearFechaVisita(visit.fechaHora)} - {formatearHoraVisita(visit.fechaHora)}
        </span>
      </div>
    </div>

    {pestana && (
      <div className="flex items-center gap-6 px-6 pt-3 border-b border-border bg-white">
        {PESTANAS.map(({ clave, etiqueta, Icono }) => (
          <button
            key={clave}
            onClick={() => onPestana(clave)}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              pestana === clave
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icono className="h-4.5 w-4.5" />
            {etiqueta}
          </button>
        ))}
      </div>
    )}
  </>
);
