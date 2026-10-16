import { Check, ChevronDown, Clock, Circle, Lock } from 'lucide-react';
import type { Plantilla } from '@/entities/model-plantillas';

type Desempeno = Plantilla['desempenos'][number];

/** Las tres secciones de la barra lateral, en el orden del recorrido. */
export type SeccionDeFicha = 'criterios' | 'planificacion' | 'cierre';

/** Pasos de cierre navegables desde el índice. */
export type PasoCierreTipo = 'obs' | 'sugerencias' | 'compromisos' | 'evidencia';

interface ListaDesempenosProps {
  desempenos: Desempeno[];
  seleccionadoId: string;
  /** Nivel elegido por desempeño; su ausencia es «sin evaluar». */
  nivelesElegidos: Record<string, string>;
  /** Criterios con nivel y justificación: sólo ellos llevan la marca de completado. */
  completos?: ReadonlySet<string>;
  /** Criterios a los que todavía no se puede entrar: hay uno anterior incompleto. */
  bloqueados?: ReadonlySet<string>;
  /** El cierre se abre recién con todos los criterios completos. */
  cierreBloqueado?: boolean;
  /** El instrumento EIB usa escala cualitativa (Sí/Parcialmente/No), no niveles. */
  esEib?: boolean;
  /** Completitud de cada paso de cierre, para que el índice no deje olvidar ninguno. */
  cierre?: {
    observaciones: boolean;
    sugerencias: boolean;
    compromisos: boolean;
    evidencia: boolean;
  };
  /** Sección que contiene el paso abierto: es la única que muestra sus ítems. */
  seccionActiva?: SeccionDeFicha;
  /** Lleva al primer criterio, al tocar el encabezado de «Criterios» desde otra sección. */
  onAbrirCriterios?: () => void;
  /** Paso de planificación y diseño de la evaluación, entre los criterios y el cierre. */
  planificacion?: {
    completa: boolean;
    activa: boolean;
    bloqueada: boolean;
    /** Ítems con nivel y observación, y total, para el avance del encabezado. */
    hechos: number;
    total: number;
    onSeleccionar: () => void;
  };
  /** Paso de cierre activo en el panel, si el escenario no muestra un criterio. */
  pasoCierreActivo?: PasoCierreTipo | null;
  onSeleccionar: (desempenoId: string) => void;
  onSeleccionarCierre?: (paso: PasoCierreTipo) => void;
}

/**
 * Encabezado desplegable de una sección de la barra lateral.
 *
 * Siempre muestra el avance, aunque la sección esté contraída: contraerla no
 * debe esconder qué falta. Tocarlo lleva al primer paso de la sección (el
 * panel de la derecha cambia); en la sección ya abierta no hace nada, y en una
 * bloqueada tampoco.
 */
function EncabezadoDeSeccion({
  titulo,
  avance,
  claveAvance,
  completa,
  abierta,
  bloqueada,
  conCuerpo,
  onClick,
}: {
  titulo: string;
  avance: string;
  claveAvance: SeccionDeFicha;
  completa: boolean;
  abierta: boolean;
  bloqueada: boolean;
  /** La sección despliega ítems; la planificación es un único paso y no. */
  conCuerpo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={bloqueada || abierta ? undefined : onClick}
      aria-disabled={bloqueada}
      aria-expanded={abierta}
      title={bloqueada ? MOTIVO_BLOQUEO : undefined}
      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all select-none ${
        bloqueada
          ? 'opacity-50 cursor-not-allowed border-transparent'
          : abierta
            ? 'border-primary/40 bg-primary-light/40 cursor-default'
            : 'border-border bg-surface hover:bg-slate-100 cursor-pointer'
      }`}
    >
      <span className="flex-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
        {titulo}
      </span>
      <span
        data-avance={claveAvance}
        className={`text-[10px] font-black ${completa ? 'text-emerald-600' : 'text-slate-400'}`}
      >
        {avance}
      </span>
      {completa && <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />}
      {bloqueada && <Lock className="h-3 w-3 text-slate-400" strokeWidth={2.5} />}
      {conCuerpo && !bloqueada && (
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  );
}

/** Por qué un paso no se abre: el recorrido es en orden y sin saltear. */
const MOTIVO_BLOQUEO = 'Complete el paso anterior (nivel y justificación) para continuar';

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
  bloqueado = false,
  onClick,
}: {
  etiqueta: string;
  estado: EstadoCierre;
  activo: boolean;
  bloqueado?: boolean;
  onClick: () => void;
}) {
  const leyenda = LEYENDA[estado];
  return (
    <div
      onClick={bloqueado ? undefined : onClick}
      aria-disabled={bloqueado}
      title={bloqueado ? MOTIVO_BLOQUEO : undefined}
      className={`p-3 border rounded-xl transition-all flex items-center gap-2 shadow-xs bg-surface select-none ${
        bloqueado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'
      } ${activo ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
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
  completos,
  bloqueados,
  cierreBloqueado = false,
  esEib = false,
  seccionActiva = 'criterios',
  onAbrirCriterios,
  planificacion,
  cierre,
  pasoCierreActivo = null,
  onSeleccionar,
  onSeleccionarCierre,
}: ListaDesempenosProps) => (
  <div className="w-full md:w-80 border-r border-border p-3.5 space-y-2 bg-slate-50/70 shrink-0">
    <EncabezadoDeSeccion
      titulo="Criterios / Desempeños"
      avance={`${completos ? completos.size : Object.keys(nivelesElegidos).length}/${desempenos.length}`}
      claveAvance="criterios"
      completa={
        desempenos.length > 0 &&
        (completos ? completos.size : Object.keys(nivelesElegidos).length) === desempenos.length
      }
      abierta={seccionActiva === 'criterios'}
      bloqueada={false}
      conCuerpo
      onClick={() => onAbrirCriterios?.()}
    />

    {seccionActiva === 'criterios' && desempenos.map((desempeno, indice) => {
      const seleccionado = seleccionadoId === desempeno.id;
      const nivel = nivelesElegidos[desempeno.id];
      const bloqueado = bloqueados?.has(desempeno.id) ?? false;
      // Sin la lista de completos (uso aislado) basta el nivel, como antes.
      const completo = completos ? completos.has(desempeno.id) : !!nivel;

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
            onClick={() => !bloqueado && onSeleccionar(desempeno.id)}
            aria-disabled={bloqueado}
            title={bloqueado ? MOTIVO_BLOQUEO : undefined}
            className={`p-3 border rounded-xl transition-all flex items-start gap-2 shadow-xs leading-snug text-left select-none relative ${
              bloqueado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${
              seleccionado
                ? 'border-primary ring-1 ring-primary/40 bg-primary-light/50 font-extrabold text-primary shadow-sm'
                : `border-border bg-surface text-slate-600 ${bloqueado ? '' : 'hover:bg-slate-100'}`
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

          {completo && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center rounded-full">
              <Check className="h-2.5 w-2.5 font-bold" strokeWidth={3} />
            </span>
          )}
          {bloqueado && (
            <Lock
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
              strokeWidth={2.5}
            />
          )}
        </div>
      </div>
      );
    })}

    {planificacion && (
      <EncabezadoDeSeccion
        titulo="Planificación y diseño de evaluación"
        avance={`${planificacion.hechos}/${planificacion.total}`}
        claveAvance="planificacion"
        completa={planificacion.completa}
        abierta={planificacion.activa}
        bloqueada={planificacion.bloqueada}
        conCuerpo={false}
        onClick={planificacion.onSeleccionar}
      />
    )}

    {cierre && (
      <div className="space-y-2">
        <EncabezadoDeSeccion
          titulo="Cierre de la evaluación"
          avance={`${[cierre.observaciones, cierre.sugerencias, cierre.compromisos].filter(Boolean).length}/3`}
          claveAvance="cierre"
          completa={cierre.observaciones && cierre.sugerencias && cierre.compromisos}
          abierta={seccionActiva === 'cierre'}
          bloqueada={cierreBloqueado}
          conCuerpo
          onClick={() => onSeleccionarCierre?.('obs')}
        />
        {seccionActiva === 'cierre' && (
          <>
            <ItemCierre
              etiqueta="Observaciones Generales"
              bloqueado={cierreBloqueado}
              estado={cierre.observaciones ? 'ok' : 'pendiente'}
              activo={pasoCierreActivo === 'obs'}
              onClick={() => onSeleccionarCierre?.('obs')}
            />
            <ItemCierre
              etiqueta="Sugerencias"
              bloqueado={cierreBloqueado}
              estado={cierre.sugerencias ? 'ok' : 'pendiente'}
              activo={pasoCierreActivo === 'sugerencias'}
              onClick={() => onSeleccionarCierre?.('sugerencias')}
            />
            <ItemCierre
              etiqueta="Compromisos"
              bloqueado={cierreBloqueado}
              estado={cierre.compromisos ? 'ok' : 'pendiente'}
              activo={pasoCierreActivo === 'compromisos'}
              onClick={() => onSeleccionarCierre?.('compromisos')}
            />
            <ItemCierre
              etiqueta="Evidencia"
              bloqueado={cierreBloqueado}
              estado={cierre.evidencia ? 'ok' : 'opcional'}
              activo={pasoCierreActivo === 'evidencia'}
              onClick={() => onSeleccionarCierre?.('evidencia')}
            />
          </>
        )}
      </div>
    )}
  </div>
);
