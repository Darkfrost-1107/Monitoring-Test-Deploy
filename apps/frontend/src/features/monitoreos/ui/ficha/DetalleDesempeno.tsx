import { FileText, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
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
  esEib?: boolean;
  indiceActual?: number;
  totalDesempenos?: number;
  totalEvaluados?: number;
  onAnterior?: () => void;
  onSiguiente?: () => void;
}

const CLASES_TEXTAREA =
  'w-full bg-surface border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner h-24 resize-none leading-relaxed';

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

const EtiquetaSeccion = ({ children }: { children: string }) => (
  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
    {children}
  </span>
);

const getOpcionesEib = (desempeno: Desempeno) => {
  const rubNo = desempeno.rubrica?.find((r) => r.nivel === 'I')?.descripcion?.trim();
  const rubParcial = desempeno.rubrica?.find((r) => r.nivel === 'II')?.descripcion?.trim();
  const rubSi = desempeno.rubrica?.find((r) => r.nivel === 'III')?.descripcion?.trim();

  const esPlanificacion =
    desempeno.descripcionCorta?.toUpperCase().includes('PLANIFICACIÓN') ||
    desempeno.descripcionCorta?.toUpperCase().includes('PLANIFICACION') ||
    desempeno.descripcionCorta?.toUpperCase().includes('DOCUMENTO') ||
    desempeno.descripcionCorta?.trim().startsWith('III');

  const presetDefault = esPlanificacion
    ? {
        si: 'Se evidencia de forma clara, consistente y alineada con el MSEIB',
        parcialmente: 'Aparece parcialmente o con indicios, pero requiere ajustes o fortalecimiento',
        no: 'No se evidencia el criterio en el documento',
      }
    : {
        si: 'Se evidencia en la sesión de forma clara y consistente',
        parcialmente: 'Se evidencia de forma incipiente o con necesidad de acompañamiento',
        no: 'No se observa evidencia de la práctica durante la sesión',
      };

  const textoSi = rubSi && rubSi !== 'Sí' ? rubSi : presetDefault.si;
  const textoParcial = rubParcial && rubParcial !== 'Parcialmente' ? rubParcial : presetDefault.parcialmente;
  const textoNo = rubNo && rubNo !== 'No' ? rubNo : presetDefault.no;

  return [
    {
      nivel: 'III',
      rotulo: 'Sí',
      descripcion: textoSi,
      color: '#16a34a',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      activeBg: 'bg-emerald-600 text-white',
    },
    {
      nivel: 'II',
      rotulo: 'Parcialmente',
      descripcion: textoParcial,
      color: '#d97706',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      activeBg: 'bg-amber-500 text-white',
    },
    {
      nivel: 'I',
      rotulo: 'No',
      descripcion: textoNo,
      color: '#dc2626',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      activeBg: 'bg-rose-600 text-white',
    },
  ];
};

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
  esEib = false,
  indiceActual = 0,
  totalDesempenos = 0,
  totalEvaluados = 0,
  onAnterior,
  onSiguiente,
}: DetalleDesempenoProps) => {
  if (!desempeno) {
    return (
      <div className="flex-1 p-6 space-y-6 md:sticky md:top-0 self-start bg-white">
        <div className="h-48 flex flex-col items-center justify-center text-slate-300">
          <FileText className="h-10 w-10 mb-2 stroke-1" />
          <span className="text-xs font-semibold">Seleccione un desempeño a la izquierda</span>
        </div>
      </div>
    );
  }

  const hayAspectos = mostrarAspectos && !!desempeno.aspectos?.length;

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-5 md:sticky md:top-0 self-start max-h-[560px] bg-white">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="space-y-2">
          {esEib && desempeno.descripcionCorta && (() => {
            const { seccion, subcriterio } = parseSeccionYSubcriterio(desempeno.descripcionCorta);
            return (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10.5px] font-black uppercase tracking-wider">
                  {seccion}
                </div>
                {subcriterio && (
                  <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                    {subcriterio}
                  </div>
                )}
              </div>
            );
          })()}
          <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
            {desempeno.nombre}
          </h3>
          {!esEib && desempeno.descripcionCorta && (
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {desempeno.descripcionCorta}
            </p>
          )}
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
            {esEib
              ? 'Valoración del Criterio / Ítem (Haz clic para seleccionar)'
              : 'Descripción de Niveles (Haz clic en un nivel para seleccionar)'}
          </EtiquetaSeccion>

          {esEib ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {getOpcionesEib(desempeno).map((opcion) => {
                const elegido = respuesta.nivel === opcion.nivel;

                return (
                  <button
                    key={opcion.nivel}
                    type="button"
                    disabled={soloLectura}
                    onClick={() => onElegirNivel(opcion.nivel)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
                      soloLectura ? 'cursor-default' : 'cursor-pointer hover:shadow-xs'
                    } ${
                      elegido
                        ? `${opcion.activeBg} shadow-md border-transparent`
                        : `${opcion.bg} ${opcion.border}`
                    }`}
                  >
                    <span
                      className={`text-sm font-black ${elegido ? 'text-white' : ''}`}
                      style={{ color: elegido ? '#ffffff' : opcion.color }}
                    >
                      {opcion.rotulo}
                    </span>
                    <span
                      className={`text-[11px] leading-tight ${
                        elegido ? 'text-white/90' : 'text-slate-600'
                      }`}
                    >
                      {opcion.descripcion}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
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
          )}
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

        {/* Barra de Navegación Rápida y Avance */}
        {totalDesempenos > 1 && (
          <div className="pt-4 mt-6 border-t border-slate-200/80 flex items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              disabled={!onAnterior}
              onClick={onAnterior}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                onAnterior
                  ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-98'
                  : 'bg-slate-100/60 text-slate-300 border border-transparent cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-700 tracking-tight">
                  Criterio {indiceActual + 1} de {totalDesempenos}
                </span>
                <span className="text-[9.5px] font-bold text-slate-400">
                  {totalEvaluados} de {totalDesempenos} evaluados
                </span>
              </div>
              {respuesta.nivel ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                  <CheckCircle2 className="h-3 w-3" />
                  Completado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!onSiguiente}
              onClick={onSiguiente}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                onSiguiente
                  ? 'bg-primary text-white hover:bg-primary-dark shadow-xs cursor-pointer active:scale-98'
                  : 'bg-slate-100/60 text-slate-300 border border-transparent cursor-not-allowed'
              }`}
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
