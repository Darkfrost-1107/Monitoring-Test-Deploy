import { useRef, useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { agregarEspecialidadExtra } from '../lib/perfil-especialista';

/**
 * Menciones adicionales de un especialista de Secundaria.
 *
 * Estaba dentro de `EspecialistaFormBase` con su propio estado y tres
 * manejadores. Los rechazos eran `return` mudos: escribir una especialidad ya
 * puesta y pulsar «Agregar» no hacía nada ni explicaba nada.
 */

interface Props {
  extras: string[];
  principal: string | null | undefined;
  onCambiar: (extras: string[]) => void;
}

export const EspecialidadesExtras = ({ extras, principal, onCambiar }: Props) => {
  const [texto, setTexto] = useState('');
  const [motivo, setMotivo] = useState<string | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  const agregar = () => {
    const resultado = agregarEspecialidadExtra(extras, texto, principal);

    if (!resultado.ok) {
      setMotivo(resultado.motivo ?? null);
      return;
    }

    onCambiar(resultado.extras ?? extras);
    setTexto('');
    setMotivo(null);
    campoRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5 mt-[18px]">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        Especialidades Extras / Temporales
        <span className="ml-1 text-text-muted font-normal normal-case">(Opcional)</span>
      </label>

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {extras.map((especialidad) => (
            <span
              key={especialidad}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {especialidad}
              <button
                type="button"
                aria-label={`Quitar ${especialidad}`}
                onClick={() => onCambiar(extras.filter((e) => e !== especialidad))}
                className="hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 max-w-md">
        <input
          ref={campoRef}
          type="text"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setMotivo(null);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            // El formulario entero se enviaría con Enter; acá sólo se agrega.
            e.preventDefault();
            agregar();
          }}
          placeholder="Ej. Historia, Inglés..."
          className="flex-1 text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>

      {motivo && (
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {motivo}
        </div>
      )}
    </div>
  );
};
