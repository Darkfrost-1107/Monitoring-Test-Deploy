import { FileText } from 'lucide-react';
import type { Plantilla } from '@/entities/model-plantillas';

type Desempeno = Plantilla['desempenos'][number];
type NivelPlantilla = Plantilla['niveles'][number];

/** Lo que el evaluador respondió sobre este desempeño. */
export interface RespuestaDesempeno {
  nivel?: string;
  preguntaExtra?: boolean;
  observacion: string;
}

interface DetalleDesempenoProps {
  desempeno: Desempeno | null;
  niveles: NivelPlantilla[];
  respuesta: RespuestaDesempeno;
  onElegirNivel: (nivel: string) => void;
  onResponderExtra: (respuesta: boolean) => void;
  onObservar: (texto: string) => void;
  /** Los aspectos son del monitoreo a docente; el directivo no los lleva. */
  mostrarAspectos: boolean;
  soloLectura: boolean;
}

const CLASES_TEXTAREA =
  'w-full bg-surface border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner h-24 resize-none leading-relaxed';

const EtiquetaSeccion = ({ children }: { children: string }) => (
  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
    {children}
  </span>
);

/** Rúbrica del desempeño seleccionado: niveles, pregunta extra y justificación. */
export const DetalleDesempeno = ({
  desempeno,
  niveles,
  respuesta,
  onElegirNivel,
  onResponderExtra,
  onObservar,
  mostrarAspectos,
  soloLectura,
}: DetalleDesempenoProps) => {
  if (!desempeno) {
    return (
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="h-full flex flex-col items-center justify-center text-slate-300">
          <FileText className="h-10 w-10 mb-2 stroke-1" />
          <span className="text-xs font-semibold">Seleccione un desempeño a la izquierda</span>
        </div>
      </div>
    );
  }

  const hayAspectos = mostrarAspectos && !!desempeno.aspectos?.length;

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
            {desempeno.nombre}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {desempeno.descripcionCorta}
          </p>
        </div>

        {hayAspectos && (
          <div className="space-y-3">
            <EtiquetaSeccion>Aspectos a Considerar</EtiquetaSeccion>
            <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5">
              {desempeno.aspectos?.map((aspecto, idx) => (
                <li key={aspecto.id}>
                  <strong>Aspecto {idx + 1}:</strong> {aspecto.descripcion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3.5 pt-1">
          <EtiquetaSeccion>
            Descripción de Niveles (Haz clic en un nivel para seleccionar)
          </EtiquetaSeccion>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {niveles.map((nivel) => {
              const detalle = desempeno.rubrica?.find((r) => r.nivel === nivel.nivel);
              const elegido = respuesta.nivel === nivel.nivel;

              return (
                <div
                  key={nivel.nivel}
                  onClick={() => {
                    if (!soloLectura) onElegirNivel(nivel.nivel);
                  }}
                  className={`border rounded-xl p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all duration-200 ${
                    soloLectura ? 'cursor-default' : 'cursor-pointer hover:shadow font-semibold'
                  } ${
                    elegido ? 'ring-2 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-surface'
                  }`}
                  style={{
                    borderColor: elegido ? nivel.color : '#e2e8f0',
                    backgroundColor: elegido ? `${nivel.color}07` : 'transparent',
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: nivel.color }}
                  />

                  <div className="pl-2 flex flex-col gap-1">
                    <span
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: nivel.color }}
                    >
                      Nivel {nivel.nivel}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: nivel.color }}>
                      {nivel.denominacion}
                    </span>
                  </div>

                  <p className="pl-2 text-[11px] text-slate-700 font-medium leading-relaxed">
                    {detalle?.descripcion || 'Sin descripción registrada.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {desempeno.preguntaExtra && (
          <div className="space-y-2 mt-4 p-4 border border-slate-200 rounded-xl bg-amber-50/30">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
              Pregunta Extra
            </span>
            <p className="text-sm font-medium text-slate-700">{desempeno.preguntaExtra}</p>
            <div className="flex gap-4 mt-2">
              {[
                { valor: true, etiqueta: 'SÍ', color: 'accent-emerald-600 text-emerald-700' },
                { valor: false, etiqueta: 'NO', color: 'accent-red-600 text-red-600' },
              ].map(({ valor, etiqueta, color }) => (
                <label key={etiqueta} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`pregunta-${desempeno.id}`}
                    checked={respuesta.preguntaExtra === valor}
                    onChange={() => onResponderExtra(valor)}
                    disabled={soloLectura}
                    className={color.split(' ')[0]}
                  />
                  <span className={`text-xs font-bold ${color.split(' ')[1]}`}>{etiqueta}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 mt-4">
          <EtiquetaSeccion>Observaciones para esta Rúbrica</EtiquetaSeccion>
          <textarea
            value={respuesta.observacion}
            onChange={(e) => onObservar(e.target.value)}
            disabled={soloLectura}
            placeholder="Escriba observaciones o evidencias encontradas para esta rúbrica específica..."
            className={CLASES_TEXTAREA}
          />
        </div>
      </div>
    </div>
  );
};
