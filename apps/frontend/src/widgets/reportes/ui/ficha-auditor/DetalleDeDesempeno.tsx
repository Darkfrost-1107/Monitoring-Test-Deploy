import { FileText } from 'lucide-react';
import type { Plantilla } from '@entities/model-plantillas';

/**
 * El desempeño abierto en la auditoría: sus aspectos, su pregunta adicional y
 * la rúbrica con el nivel que quedó registrado.
 *
 * Eran ciento diez líneas dentro de `FichaAuditorModal`.
 */

type Desempeno = Plantilla['desempenos'][number];
type Nivel = Plantilla['niveles'][number];

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
    {children}
  </span>
);

interface Props {
  desempeno: Desempeno | null;
  niveles: readonly Nivel[];
  nivelRegistrado: string | null;
  respuestaExtra: boolean | undefined;
}

export const DetalleDeDesempeno = ({
  desempeno,
  niveles,
  nivelRegistrado,
  respuestaExtra,
}: Props) => {
  if (!desempeno) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-300">
        <FileText className="h-10 w-10 mb-2 stroke-1" />
        <span className="text-xs font-semibold">Seleccione un desempeño</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
          {desempeno.nombre}
        </h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed border-b border-slate-100 pb-2">
          {desempeno.descripcionCorta}
        </p>
      </div>

      {desempeno.aspectos?.length > 0 && (
        <div className="space-y-3">
          <Rotulo>Aspectos Considerados</Rotulo>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5">
            {desempeno.aspectos.map((aspecto, indice) => (
              <li key={aspecto.id}>
                <strong>Aspecto {indice + 1}:</strong> {aspecto.descripcion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {desempeno.preguntaExtra && (
        <div className="space-y-2 p-4 border border-slate-200 rounded-xl bg-amber-50/30">
          <Rotulo>Pregunta Extra</Rotulo>
          <p className="text-sm font-medium text-slate-700">{desempeno.preguntaExtra}</p>
          <div className="mt-1 text-xs font-bold">
            Respuesta: <RespuestaExtra respuesta={respuestaExtra} />
          </div>
        </div>
      )}

      <div className="space-y-3.5 pt-1">
        <Rotulo>Descripción de Niveles (Evaluación Registrada)</Rotulo>

        {!nivelRegistrado && (
          <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Este desempeño no fue calificado.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {niveles.map((nivel) => (
            <TarjetaDeNivel
              key={nivel.nivel}
              nivel={nivel}
              descripcion={desempeno.rubrica?.find((r) => r.nivel === nivel.nivel)?.descripcion}
              registrado={nivelRegistrado === nivel.nivel}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/** Un «no» es una respuesta; distinta de no haber respondido. */
const RespuestaExtra = ({ respuesta }: { respuesta: boolean | undefined }) => {
  if (respuesta === true) return <span className="text-emerald-700">SÍ</span>;
  if (respuesta === false) return <span className="text-red-600">NO</span>;
  return <span className="text-slate-400 italic">Sin responder</span>;
};

const TarjetaDeNivel = ({
  nivel,
  descripcion,
  registrado,
}: {
  nivel: Nivel;
  descripcion?: string;
  registrado: boolean;
}) => (
  <div
    className={`border rounded-xl p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all duration-200 ${
      registrado ? 'ring-2 bg-slate-50 border-transparent shadow' : 'border-slate-200 opacity-60 bg-surface'
    }`}
    style={{
      borderColor: registrado ? nivel.color : '#e2e8f0',
      backgroundColor: registrado ? `${nivel.color}07` : 'transparent',
    }}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: nivel.color }} />

    <div className="pl-2 flex flex-col gap-1">
      <span className="text-xs font-black uppercase tracking-wider" style={{ color: nivel.color }}>
        Nivel {nivel.nivel}
      </span>
      <span className="text-[10px] font-bold" style={{ color: nivel.color }}>
        {nivel.denominacion}
      </span>
    </div>

    <p className="pl-2 text-[11px] text-slate-700 font-medium leading-relaxed">
      {descripcion || 'Sin descripción registrada.'}
    </p>

    {registrado && (
      <span className="absolute right-3.5 top-3.5 bg-emerald-500 text-white rounded-full h-4 w-4 flex items-center justify-center border border-white shadow-sm font-bold text-[8px]">
        ✓
      </span>
    )}
  </div>
);
