interface CierreNarrativoSeccionProps {
  sugerencias: string;
  compromisos: string;
  onSugerencias: (texto: string) => void;
  onCompromisos: (texto: string) => void;
  soloLectura: boolean;
}

const CLASES_TEXTAREA =
  'w-full bg-surface border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner h-24 resize-none leading-relaxed';

/**
 * Sugerencias y compromisos: el cierre de la evaluación.
 *
 * Ambos son obligatorios para finalizar la ficha. Son la parte que el docente
 * evaluado se lleva —qué mejorar y a qué se compromete—, y por eso no admiten
 * quedar en blanco.
 */
export const CierreNarrativoSeccion = ({
  sugerencias,
  compromisos,
  onSugerencias,
  onCompromisos,
  soloLectura,
}: CierreNarrativoSeccionProps) => (
  <div className="p-5 border-t border-border bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
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
);
