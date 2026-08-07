import { Clock, PlayCircle, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { formatearFechaVisita } from '../../lib/visita-presentacion';

/** Situación del usuario frente a esta visita, que es lo que habilita cada acción. */
export interface SituacionEvaluador {
  /** ¿Es la persona asignada para levantar la ficha? */
  puedeEvaluar: boolean;
  /** ¿Levanta fichas en el aula? Sólo ese perfil solicita reprogramaciones. */
  esMonitorCampo: boolean;
  /** ¿Hoy es el día programado? */
  esFechaCoincidente: boolean;
}

interface AccionesVisitaProps {
  visita: Cronograma;
  solicitud: SolicitudReprogramacion | null;
  evaluador: SituacionEvaluador;
  onIniciarFicha: () => void;
  onVerFichaLlena: () => void;
  onSolicitarReprogramacion: () => void;
  onVerSolicitud: () => void;
}

/** Estados en los que la visita todavía admite trabajo sobre su ficha. */
const ESTADOS_EN_CURSO: readonly Cronograma['estado'][] = [
  'PROGRAMADO',
  'EN_PROCESO',
  'REPROGRAMADO',
];

/** Estados en los que la ficha aún no se abrió. */
const ESTADOS_SIN_INICIAR: readonly Cronograma['estado'][] = ['PROGRAMADO', 'REPROGRAMADO'];

/**
 * Acciones disponibles sobre la visita seleccionada.
 *
 * Presentación pura: recibe ya resuelto qué puede hacer el usuario y sólo
 * decide qué botones y avisos mostrar. Quién puede evaluar se resuelve en
 * `entities/model-cronogramas/evaluador.ts`, no acá.
 */
export const AccionesVisita = ({
  visita,
  solicitud,
  evaluador,
  onIniciarFicha,
  onVerFichaLlena,
  onSolicitarReprogramacion,
  onVerSolicitud,
}: AccionesVisitaProps) => {
  const enCurso = ESTADOS_EN_CURSO.includes(visita.estado);
  const sinIniciar = ESTADOS_SIN_INICIAR.includes(visita.estado);
  const fueraDeFecha = sinIniciar && !evaluador.esFechaCoincidente;

  return (
    <div className="space-y-2 pt-4 border-t border-border mt-6">
      {enCurso &&
        (evaluador.puedeEvaluar ? (
          <div className="flex flex-col gap-2.5">
            {fueraDeFecha && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Restricción de Fecha:</strong> Solo puede iniciar esta visita el día
                  programado ({formatearFechaVisita(visita.fechaHora)}).
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={fueraDeFecha}
                onClick={onIniciarFicha}
                className="flex-1 justify-center border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-bold text-xs py-2.5 h-10 flex items-center gap-2 cursor-pointer"
              >
                <PlayCircle className="h-4.5 w-4.5" />
                <span>{sinIniciar ? 'Iniciar Monitoreo' : 'Continuar Monitoreo'}</span>
              </Button>

              {/* Reprogramar: lo solicita quien levanta la ficha en el aula. */}
              {evaluador.esMonitorCampo && (
                <Button
                  variant="outline"
                  onClick={solicitud ? onVerSolicitud : onSolicitarReprogramacion}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold text-xs py-2.5 h-10 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-primary" />
                  <span>{solicitud ? 'Ver Solicitud' : 'Reprogramar'}</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 text-[11px] font-medium leading-relaxed flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
              <Clock className="h-4.5 w-4.5 text-blue-500 mt-0.5 shrink-0" />
              <span>
                <strong>Acceso Restringido:</strong> Solo la persona asignada ({' '}
                <strong>{visita.especialista}</strong>) puede ejecutar esta ficha de monitoreo.
              </span>
            </div>

            {solicitud && visita.estado !== 'REPROGRAMADO' && (
              <Button
                variant="outline"
                onClick={onVerSolicitud}
                className="w-full justify-center border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2 h-10 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span>Ver Solicitud de Cambio ({solicitud.estado})</span>
              </Button>
            )}
          </div>
        ))}

      {visita.estado === 'COMPLETADO' && (
        <div className="flex flex-col gap-2">
          <div className="text-center p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-inner">
            <CheckCircle2 className="h-4 w-4" />
            <span>Visita Realizada con Éxito</span>
          </div>

          <Button
            variant="outline"
            onClick={onVerFichaLlena}
            className="w-full justify-center border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold py-2 cursor-pointer"
          >
            Ver Ficha de Monitoreo Llena
          </Button>

          {solicitud && (
            <Button
              variant="outline"
              onClick={onVerSolicitud}
              className="w-full justify-center border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 h-9 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span>Ver Historial de Reprogramación</span>
            </Button>
          )}
        </div>
      )}

      {visita.estado === 'REPROGRAMADO' && !evaluador.puedeEvaluar && (
        <div className="flex flex-col gap-2">
          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-amber-800 text-[11px] font-medium leading-relaxed flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mt-0.5 shrink-0" />
            <span>
              <strong>Visita Reprogramada:</strong> La fecha original fue modificada. Se encuentra
              pendiente de ser iniciada por el especialista en la nueva fecha.
            </span>
          </div>

          {solicitud && (
            <Button
              variant="outline"
              onClick={onVerSolicitud}
              className="w-full justify-center border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 h-9 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span>Ver Detalle de Reprogramación</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
