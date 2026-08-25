import { useEffect } from 'react';
import { EvidenciaGeneralSeccion } from './EvidenciaGeneralSeccion';

/** Los campos de cierre, usados por el índice como checklist y como foco. */
export type PasoCierreTipo = 'obs' | 'sugerencias' | 'compromisos' | 'evidencia';

interface PasoCierreProps {
  observaciones: string;
  sugerencias: string;
  compromisos: string;
  onObservaciones: (texto: string) => void;
  onSugerencias: (texto: string) => void;
  onCompromisos: (texto: string) => void;
  evidencias: Record<string, string>;
  onEvidencias: (siguientes: Record<string, string>) => void;
  onVerImagen: (url: string) => void;
  soloLectura: boolean;
  /** Campo al que saltar/resaltar al entrar a la sección desde el índice. */
  foco?: PasoCierreTipo;
}

const CLASES_TEXTAREA =
  'w-full bg-surface border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner resize-none leading-relaxed';

const EtiquetaCampo = ({ titulo, obligatorio, ayuda }: { titulo: string; obligatorio: boolean; ayuda: string }) => (
  <div className="space-y-0.5">
    <h4 className="text-sm font-black text-slate-800 tracking-tight">
      {titulo}
      <span
        className={`ml-2 text-[10px] font-bold uppercase tracking-wide ${
          obligatorio ? 'text-amber-600' : 'text-slate-400'
        }`}
      >
        {obligatorio ? 'Obligatorio' : 'Opcional'}
      </span>
    </h4>
    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{ayuda}</p>
  </div>
);

/**
 * Sección de cierre completa dentro del panel de la ficha.
 *
 * Antes vivía al pie del formulario —el evaluador tenía que scrollear y podía
 * olvidarla—. Ahora es un paso más del escenario, con TODO junto (no un campo
 * por pantalla): observaciones, sugerencias y compromisos lado a lado, y la
 * evidencia debajo, aprovechando el ancho. El índice de la izquierda salta a
 * cada campo sin dejar de ser el checklist que avisa lo que falta.
 */
export const PasoCierre = ({
  observaciones,
  sugerencias,
  compromisos,
  onObservaciones,
  onSugerencias,
  onCompromisos,
  evidencias,
  onEvidencias,
  onVerImagen,
  soloLectura,
  foco,
}: PasoCierreProps) => {
  // Al entrar a la sección desde un ítem del índice, se lleva la vista a ese
  // campo. El efecto corre tras montar, cuando el elemento ya existe.
  useEffect(() => {
    if (!foco) return;
    document
      .getElementById(`cierre-${foco}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [foco]);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 md:sticky md:top-0 self-start max-h-[560px] bg-white">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div id="cierre-obs" className="space-y-2 scroll-mt-4">
          <EtiquetaCampo
            titulo="Observaciones Generales"
            obligatorio
            ayuda="Describa cómo se desarrolló la visita en conjunto, más allá de cada rúbrica."
          />
          <textarea
            value={observaciones}
            onChange={(e) => onObservaciones(e.target.value)}
            disabled={soloLectura}
            placeholder="Describa cómo se desarrolló la visita en conjunto..."
            className={`${CLASES_TEXTAREA} h-24`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div id="cierre-sugerencias" className="space-y-2 scroll-mt-4">
            <EtiquetaCampo
              titulo="Sugerencias"
              obligatorio
              ayuda="Qué debería mejorar el docente a partir de lo observado."
            />
            <textarea
              value={sugerencias}
              onChange={(e) => onSugerencias(e.target.value)}
              disabled={soloLectura}
              placeholder="Escriba aquí las sugerencias..."
              className={`${CLASES_TEXTAREA} h-32`}
            />
          </div>

          <div id="cierre-compromisos" className="space-y-2 scroll-mt-4">
            <EtiquetaCampo
              titulo="Compromisos"
              obligatorio
              ayuda="A qué se compromete el docente de cara a la próxima visita."
            />
            <textarea
              value={compromisos}
              onChange={(e) => onCompromisos(e.target.value)}
              disabled={soloLectura}
              placeholder="Escriba aquí los compromisos..."
              className={`${CLASES_TEXTAREA} h-32`}
            />
          </div>
        </div>

        <div id="cierre-evidencia" className="space-y-2 scroll-mt-4 pt-4 border-t border-slate-100">
          <EvidenciaGeneralSeccion
            evidencias={evidencias}
            onCambiar={onEvidencias}
            onVerImagen={onVerImagen}
            soloLectura={soloLectura}
          />
        </div>
      </div>
    </div>
  );
};
