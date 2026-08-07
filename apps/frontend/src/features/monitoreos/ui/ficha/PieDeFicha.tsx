import { Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface PieDeFichaProps {
  /** Una ficha cerrada sólo se consulta: no ofrece guardar ni finalizar. */
  soloLectura: boolean;
  onCerrar: () => void;
  onGuardarBorrador: () => void;
  onFinalizar: () => void;
}

/** Acciones sobre la ficha: descartar, guardar el avance o cerrarla. */
export const PieDeFicha = ({
  soloLectura,
  onCerrar,
  onGuardarBorrador,
  onFinalizar,
}: PieDeFichaProps) => (
  <div className="p-4 border-t border-border bg-slate-50 flex justify-between items-center">
    <div>
      {!soloLectura && (
        <span className="text-[10px] text-slate-500 font-bold">
          El progreso se guarda temporalmente de forma local en la cuenta del especialista.
        </span>
      )}
    </div>

    <div className="flex items-center gap-3">
      {soloLectura ? (
        <Button
          onClick={onCerrar}
          className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 h-10 rounded-xl cursor-pointer"
        >
          Cerrar Consulta
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            onClick={onCerrar}
            className="border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 h-10 rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={onGuardarBorrador}
            className="border-primary text-primary hover:bg-primary-light text-xs font-bold px-4 py-2 h-10 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="h-4 w-4 text-primary" />
            <span>Guardar como Borrador</span>
          </Button>
          <Button
            onClick={onFinalizar}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 h-10 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
            <span>Finalizar Monitoreo</span>
          </Button>
        </>
      )}
    </div>
  </div>
);
