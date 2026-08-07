interface CierreNarrativoSeccionProps {
  observaciones: string;
  sugerencias: string;
  compromisos: string;
  onObservaciones: (texto: string) => void;
  onSugerencias: (texto: string) => void;
  onCompromisos: (texto: string) => void;
  soloLectura: boolean;
}

const CLASES_TEXTAREA =
  'w-full bg-surface border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner h-24 resize-none leading-relaxed';

/**
 * Cierre de la evaluación: observaciones generales, sugerencias y compromisos.
 *
 * Sugerencias y compromisos son obligatorios para finalizar: son la parte que
 * el docente evaluado se lleva —qué mejorar y a qué se compromete—.
 *
 * Las observaciones generales son opcionales y describen el desarrollo de la
 * visita en conjunto, más allá de cada rúbrica. El campo se persistía desde
 * siempre pero no tenía control en la interfaz, de modo que llegaba vacío a la
 * ficha y al PDF. Fase 6 de PLAN_REMEDIACION.md.
 */
export const CierreNarrativoSeccion = ({
  observaciones,
  sugerencias,
  compromisos,
  onObservaciones,
  onSugerencias,
  onCompromisos,
  soloLectura,
}: CierreNarrativoSeccionProps) => (
  <div className="p-5 border-t border-border bg-slate-50/50 space-y-4">
    <div className="space-y-2">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
        Observaciones Generales (opcional)
      </span>
      <textarea
        value={observaciones}
        onChange={(e) => onObservaciones(e.target.value)}
        disabled={soloLectura}
        placeholder="Describa cómo se desarrolló la visita en conjunto..."
        className={CLASES_TEXTAREA}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
        Sugerencias
      </span>
      <textarea
        value={sugerencias}
        onChange={(e) => onSugerencias(e.target.value)}
        disabled={soloLectura}
        placeholder="Escriba aquí las sugerencias..."
        className={CLASES_TEXTAREA}
      />
    </div>

    <div className="space-y-2">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
        Compromisos
      </span>
      <textarea
        value={compromisos}
        onChange={(e) => onCompromisos(e.target.value)}
        disabled={soloLectura}
        placeholder="Escriba aquí los compromisos..."
        className={CLASES_TEXTAREA}
      />
    </div>
    </div>
  </div>
);
