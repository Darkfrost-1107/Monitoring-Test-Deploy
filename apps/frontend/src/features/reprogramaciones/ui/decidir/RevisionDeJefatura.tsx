import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { esSolicitudDeInstitucion } from '@entities/model-reprogramaciones';

/**
 * El bloque de decisión, y el aviso para quien sólo consulta.
 *
 * El aviso comparaba el rol del solicitante contra los literales
 * `'coordinador_pedagogico'` y `'jefe_taller'`, que es justamente lo que la
 * Fase 1 unificó en `RoleCode` y lo que `esSolicitudDeInstitucion` ya resuelve
 * con cobertura.
 */

interface Props {
  onAprobar: (comentario: string) => void;
  onRechazar: (comentario: string) => void;
}

export const RevisionDeJefatura = ({ onAprobar, onRechazar }: Props) => {
  const [comentario, setComentario] = useState('');
  const [falta, setFalta] = useState(false);

  const rechazar = () => {
    // El rechazo deja al monitoreo en su fecha original y el solicitante sólo
    // recibe este texto: sin motivo, no sabe qué corregir para volver a pedirlo.
    if (!comentario.trim()) {
      setFalta(true);
      return;
    }
    onRechazar(comentario.trim());
  };

  return (
    <div className="mt-6 border border-amber-200 bg-amber-50/20 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-300 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-widest">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <span>Revisión de Jefatura (Acción Requerida)</span>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="sustento-de-la-decision"
          className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block"
        >
          Comentario / Sustento de la Decisión
        </label>
        <textarea
          id="sustento-de-la-decision"
          value={comentario}
          onChange={(e) => {
            setComentario(e.target.value);
            setFalta(false);
          }}
          placeholder="Escriba aquí los comentarios sustentatorios para la aprobación o rechazo de la reprogramación..."
          className="w-full bg-surface border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary rounded-xl p-3 text-xs text-slate-700 shadow-inner h-20 resize-none leading-relaxed"
        />
        {falta && (
          <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Indique el motivo del rechazo: es lo único que el solicitante va a recibir.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={rechazar}
          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs py-2 px-4 h-10 rounded-xl cursor-pointer"
        >
          Rechazar Solicitud
        </Button>
        <Button
          onClick={() => onAprobar(comentario.trim())}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 h-10 rounded-xl shadow cursor-pointer"
        >
          Aprobar Cambio de Fecha
        </Button>
      </div>
    </div>
  );
};

/** Aviso para quien ve la solicitud pero no la resuelve. */
export const EnRevisionPorOtro = ({ solicitanteRol }: { solicitanteRol?: string }) => (
  <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs font-medium leading-relaxed flex items-start gap-2.5 shadow-inner">
    <AlertCircle className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
    <span>
      <strong>Solicitud en Revisión:</strong>{' '}
      {esSolicitudDeInstitucion(solicitanteRol)
        ? 'Esta solicitud a nivel institucional (I.E.) fue creada por el Coordinador Pedagógico o Jefe de Taller y está pendiente de revisión y resolución por parte del Director de la Institución Educativa.'
        : 'Esta solicitud a nivel UGEL fue enviada por un Especialista de Educación y se encuentra pendiente de revisión por parte de la Jefatura de Gestión Pedagógica / Jefatura de Área.'}
    </span>
  </div>
);
