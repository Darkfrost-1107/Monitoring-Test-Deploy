import { Check, Clock, Circle } from 'lucide-react';
import type { Plantilla } from '@/entities/model-plantillas';

type Desempeno = Plantilla['desempenos'][number];

/** Pasos de cierre navegables desde el índice. */
export type PasoCierreTipo = 'obs' | 'sugerencias' | 'compromisos' | 'evidencia';

interface ListaDesempenosProps {
  desempenos: Desempeno[];
  seleccionadoId: string;
  /** Nivel elegido por desempeño; su ausencia es «sin evaluar». */
  nivelesElegidos: Record<string, string>;
  /** El instrumento EIB usa escala cualitativa (Sí/Parcialmente/No), no niveles. */
  esEib?: boolean;
  /** Completitud de cada paso de cierre, para que el índice no deje olvidar ninguno. */
  cierre?: {
    observaciones: boolean;
    sugerencias: boolean;
    compromisos: boolean;
    evidencia: boolean;
  };
  /** Paso de cierre activo en el panel, si el escenario no muestra un criterio. */
  pasoCierreActivo?: PasoCierreTipo | null;
  onSeleccionar: (desempenoId: string) => void;
  onSeleccionarCierre?: (paso: PasoCierreTipo) => void;
}

type EstadoCierre = 'ok' | 'pendiente' | 'opcional';

const ESTILO_ICONO: Record<EstadoCierre, string> = {
  ok: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  pendiente: 'bg-amber-50 border-amber-200 text-amber-600',
  opcional: 'bg-slate-100 border-slate-200 text-slate-400',
};

const LEYENDA: Record<EstadoCierre, { texto: string; clase: string }> = {
  ok: { texto: 'Completado', clase: 'text-emerald-600' },
  pendiente: { texto: 'Pendiente · obligatorio', clase: 'text-amber-600' },
  opcional: { texto: 'Opcional', clase: 'text-slate-400' },
};

/** Ítem de cierre en el índice: navega el panel al paso y muestra su avance. */
function ItemCierre({
  etiqueta,
  estado,
  activo,
  onClick,
}: {
  etiqueta: string;
  estado: EstadoCierre;
  activo: boolean;
  onClick: () => void;
}) {
  const leyenda = LEYENDA[estado];
  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-xs bg-surface hover:bg-slate-100 select-none ${
        activo ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center border ${ESTILO_ICONO[estado]}`}
      >
        {estado === 'ok' ? (
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        ) : estado === 'pendiente' ? (
          <Clock className="h-2.5 w-2.5" strokeWidth={3} />
        ) : (
          <Circle className="h-2 w-2" strokeWidth={3} />
        )}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-slate-700">{etiqueta}</div>
        <div className={`text-[9px] font-semibold ${leyenda.clase}`}>{leyenda.texto}</div>
      </div>
    </div>
  );
}

/**
 * Rótulo de la valoración según la escala del instrumento. La EIB es tripartita
 * (Sí/Parcialmente/No, mapeada a III/II/I); el resto usa los niveles I–IV. Antes
 * se aplicaba la escala EIB a toda ficha, así que una ficha regular en nivel III
 * mostraba «Sí».
 */
function rotuloValoracion(nivel: string | undefined, esEib: boolean): string {
  if (!nivel) return 'Sin evaluar';
  if (esEib) {
    if (nivel === 'III') return 'Sí';
    if (nivel === 'II') return 'Parcialmente';
    if (nivel === 'I') return 'No';
  }
  return `Nivel ${nivel}`;
}

function parseSeccionYSubcriterio(raw?: string) {
  if (!raw) return { seccion: '', subcriterio: null };
  const trimmed = raw.trim();
  if (trimmed.includes(' — ')) {
    const [seccion, ...sub] = trimmed.split(' — ');
    return { seccion: seccion.trim(), subcriterio: sub.join(' — ').trim() || null };
  }
  if (trimmed.includes('\n')) {
    const [seccion, ...sub] = trimmed.split('\n');
    return { seccion: seccion.trim(), subcriterio: sub.join(' ').trim() || null };
  }
  if (trimmed.includes(' - ')) {
    const [seccion, ...sub] = trimmed.split(' - ');
    return { seccion: seccion.trim(), subcriterio: sub.join(' - ').trim() || null };
  }
  return { seccion: trimmed, subcriterio: null };
}

/**
 * Índice de criterios a evaluar, con su avance.
 *
 * La marca de evaluado importa: la ficha no se puede cerrar con desempeños sin
 * calificar, y esta lista es donde el evaluador ve cuáles le faltan.
 */
export const ListaDesempenos = ({
  desempenos,
  seleccionadoId,
  nivelesElegidos,
  esEib = false,
  cierre,
  pasoCierreActivo = null,
  onSeleccionar,
  onSeleccionarCierre,
}: ListaDesempenosProps) => (
  <div className="w-full md:w-80 border-r border-border p-3.5 overflow-y-auto space-y-2 bg-slate-50/70 max-h-[500px] md:max-h-[560px] shrink-0">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2 px-1">
      Criterios / Desempeños ({desempenos.length})
    </span>

    {desempenos.map((desempeno, indice) => {
      const seleccionado = seleccionadoId === desempeno.id;
      const nivel = nivelesElegidos[desempeno.id];

      // La agrupación por Sección/Subcriterio es propia del instrumento EIB, que
      // estructura la descripción como «Sección — Subcriterio». En docente regular
      // la descripción es un párrafo suelto: mostrarla como encabezado saturaba el
      // índice, y el nombre del criterio (en la tarjeta) ya alcanza.
      const actualParsed = esEib
        ? parseSeccionYSubcriterio(desempeno.descripcionCorta)
        : { seccion: '', subcriterio: null };
      const previaParsed =
        esEib && indice > 0
          ? parseSeccionYSubcriterio(desempenos[indice - 1]?.descripcionCorta)
          : null;

      const esNuevaSeccion =
        actualParsed.seccion !== '' && (!previaParsed || actualParsed.seccion !== previaParsed.seccion);

      const esNuevoSubcriterio =
        actualParsed.subcriterio !== null &&
        (esNuevaSeccion || actualParsed.subcriterio !== previaParsed?.subcriterio);

      return (
        <div key={desempeno.id} className="space-y-1">
          {esNuevaSeccion && (
            <div className="pt-2.5 pb-0.5 text-[10px] font-black text-primary uppercase tracking-wider px-1 border-t border-slate-200/60 first:border-0 first:pt-0">
              {actualParsed.seccion}
            </div>
          )}

          {esNuevoSubcriterio && (
            <div className="pb-1 text-[9.5px] font-extrabold text-slate-600 uppercase tracking-wide px-1 flex items-center gap-1.5 pl-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0"></span>
              <span>{actualParsed.subcriterio}</span>
            </div>
          )}

          <div
            onClick={() => onSeleccionar(desempeno.id)}
            className={`p-3 border rounded-xl cursor-pointer transition-all flex items-start gap-2 shadow-xs leading-snug text-left select-none relative ${
              seleccionado
                ? 'border-primary ring-1 ring-primary/40 bg-primary-light/50 font-extrabold text-primary shadow-sm'
                : 'border-border bg-surface text-slate-600 hover:bg-slate-100'
            }`}
          >
          <span
            className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
              seleccionado ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {indice + 1}
          </span>

          <div className="space-y-0.5 pr-4">
            <div className="text-[11px] font-bold tracking-tight leading-snug">
              {desempeno.nombre}
            </div>
            <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
              <span>Valoración:</span>
              <strong className={nivel ? 'text-primary' : 'text-slate-400 font-normal italic'}>
                {rotuloValoracion(nivel, esEib)}
              </strong>
            </div>
          </div>

          {nivel && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center rounded-full">
              <Check className="h-2.5 w-2.5 font-bold" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
      );
    })}

    {cierre && (
      <div className="space-y-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 px-1 pt-3 mt-1 border-t border-slate-200/70">
          Cierre de la Evaluación
        </span>
        <ItemCierre
          etiqueta="Observaciones Generales"
          estado={cierre.observaciones ? 'ok' : 'pendiente'}
          activo={pasoCierreActivo === 'obs'}
          onClick={() => onSeleccionarCierre?.('obs')}
        />
        <ItemCierre
          etiqueta="Sugerencias"
          estado={cierre.sugerencias ? 'ok' : 'pendiente'}
          activo={pasoCierreActivo === 'sugerencias'}
          onClick={() => onSeleccionarCierre?.('sugerencias')}
        />
        <ItemCierre
          etiqueta="Compromisos"
          estado={cierre.compromisos ? 'ok' : 'pendiente'}
          activo={pasoCierreActivo === 'compromisos'}
          onClick={() => onSeleccionarCierre?.('compromisos')}
        />
        <ItemCierre
          etiqueta="Evidencia"
          estado={cierre.evidencia ? 'ok' : 'opcional'}
          activo={pasoCierreActivo === 'evidencia'}
          onClick={() => onSeleccionarCierre?.('evidencia')}
        />
      </div>
    )}
  </div>
);
