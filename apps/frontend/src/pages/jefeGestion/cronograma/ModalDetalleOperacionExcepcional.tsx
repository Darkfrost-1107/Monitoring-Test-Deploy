import { ShieldAlert, X, FileText, ExternalLink, Loader2, Calendar, School, User, UserCheck } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import type { IOperacionExcepcionalDetalle } from '@sistema-monitoreo/shared-contracts';

interface ModalDetalleOperacionExcepcionalProps {
  operacion: IOperacionExcepcionalDetalle;
  onCerrar: () => void;
  onAbrirPdf: (op: IOperacionExcepcionalDetalle) => void;
  descargando: boolean;
}

export const ModalDetalleOperacionExcepcional = ({
  operacion,
  onCerrar,
  onAbrirPdf,
  descargando,
}: ModalDetalleOperacionExcepcionalProps) => {
  const formatearFechaHora = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-amber-500/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-text">Detalle de Trámite Excepcional</h3>
              <p className="text-xs text-text-muted">Registro de auditoría de Mesa de Partes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar ventana"
            className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {/* Ficha principal: Expediente, Tipo y Fecha */}
          <div className="p-4 bg-muted/40 rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">N.° de Expediente / Trámite</span>
              <span className="font-mono font-bold text-sm text-text bg-surface px-2.5 py-1 rounded-md border border-border inline-block shadow-2xs">
                {operacion.numeroExpediente}
              </span>
            </div>

            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[10px] uppercase font-bold text-text-muted">Tipo de Acción</span>
              {operacion.tipoAccion === 'ANULACION_TOTAL' ? (
                <Badge className="text-xs font-bold px-2.5 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                  ANULACIÓN TOTAL
                </Badge>
              ) : (
                <Badge className="text-xs font-bold px-2.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                  REAPERTURA FICHA
                </Badge>
              )}
              <span className="text-[11px] text-text-muted mt-0.5">
                Registrado: {formatearFechaHora(operacion.createdAt)}
              </span>
            </div>
          </div>

          {/* Grilla de Datos del Monitoreo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Institución */}
            <div className="p-3 bg-surface rounded-xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-primary" />
                Institución Educativa
              </span>
              <span className="font-semibold text-text">{operacion.institucionNombre}</span>
              {operacion.institucionCodigoModular && (
                <span className="text-[11px] text-text-muted font-mono">
                  Cód. Modular: {operacion.institucionCodigoModular}
                </span>
              )}
            </div>

            {/* Docente / Evaluado */}
            <div className="p-3 bg-surface rounded-xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Docente / Evaluado
              </span>
              <span className="font-semibold text-text">{operacion.evaluadoNombre}</span>
              {operacion.evaluadoNumeroDocumento && (
                <span className="text-[11px] text-text-muted font-mono">
                  DNI: {operacion.evaluadoNumeroDocumento}
                </span>
              )}
            </div>

            {/* Monitor */}
            <div className="p-3 bg-surface rounded-xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                Especialista / Monitor
              </span>
              <span className="font-semibold text-text">{operacion.monitorNombre}</span>
              <span className="text-[11px] text-text-muted">
                Visita N.° {operacion.numeroVisita}
                {operacion.fechaVisita && ` (Programada: ${operacion.fechaVisita})`}
              </span>
            </div>

            {/* Operador que ejecutó */}
            <div className="p-3 bg-surface rounded-xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Operador UGEL
              </span>
              <span className="font-semibold text-text">{operacion.ejecutadoPorNombre}</span>
              <span className="text-[11px] text-text-muted">Personal de Mesa de Partes / JGP</span>
            </div>
          </div>

          {/* Motivo Completo */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text">Motivo / Fundamento Administrativo</span>
            <div className="p-3.5 bg-muted/30 border border-border rounded-xl text-xs text-text leading-relaxed whitespace-pre-wrap">
              {operacion.motivo}
            </div>
          </div>

          {/* Documento de Sustento */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs font-bold text-text">Documento de Sustento Oficial</span>
            {operacion.archivoSustentoUrl ? (
              <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <FileText className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text truncate">
                      Sustento-{operacion.numeroExpediente}.pdf
                    </span>
                    <span className="text-[10px] text-text-muted">Expediente probatorio autenticado</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAbrirPdf(operacion)}
                  disabled={descargando}
                  className="font-bold text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10 shrink-0 cursor-pointer"
                >
                  {descargando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Ver Sustento (PDF)
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-muted/20 border border-border/80 rounded-xl text-xs text-text-muted italic">
                No se adjuntó archivo de sustento en este registro.
              </div>
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-border shrink-0 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={onCerrar}
            className="text-xs font-bold px-4 cursor-pointer"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
