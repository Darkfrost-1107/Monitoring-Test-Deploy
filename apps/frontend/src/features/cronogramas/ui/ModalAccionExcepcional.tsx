import { useState } from 'react';
import { AlertTriangle, FileText, Loader2, ShieldAlert, Upload, X } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { toast } from 'sonner';
import type { Cronograma } from '@entities/model-cronogramas';
import type { IAccionExcepcionalInput, TipoAccionExcepcional } from '@sistema-monitoreo/shared-contracts';

interface ModalAccionExcepcionalProps {
  cronograma: Cronograma;
  abierto?: boolean;
  onCerrar: () => void;
  onConfirmar: (data: IAccionExcepcionalInput) => Promise<void>;
}

export const ModalAccionExcepcional = ({
  cronograma,
  abierto = true,
  onCerrar,
  onConfirmar,
}: ModalAccionExcepcionalProps) => {
  const [tipoAccion, setTipoAccion] = useState<TipoAccionExcepcional>('ANULACION_TOTAL');
  const [numeroExpediente, setNumeroExpediente] = useState('');
  const [motivo, setMotivo] = useState('');
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [archivoBase64, setArchivoBase64] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!abierto) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorLocal('El documento de sustento debe ser un archivo PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorLocal('El archivo no debe exceder los 10MB.');
      return;
    }

    setErrorLocal(null);
    setArchivoNombre(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setArchivoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const exp = numeroExpediente.trim();
    if (exp.length < 3) {
      setErrorLocal('Ingrese un número de expediente o trámite válido (mínimo 3 caracteres).');
      return;
    }

    const mot = motivo.trim();
    if (mot.length < 10) {
      setErrorLocal('Ingrese una justificación detallada del motivo (mínimo 10 caracteres).');
      return;
    }

    if (!archivoBase64) {
      setErrorLocal('Debe adjuntar el documento PDF que sustenta el trámite por Mesa de Partes.');
      return;
    }

    setEnviando(true);
    try {
      await onConfirmar({
        tipoAccion,
        numeroExpediente: exp,
        motivo: mot,
        archivoSustentoBase64: archivoBase64,
        archivoSustentoNombre: archivoNombre ?? 'sustento-mesa-partes.pdf',
      });
      toast.success(
        tipoAccion === 'ANULACION_TOTAL'
          ? 'Visita y ficha anuladas excepcionalmente con éxito.'
          : 'Ficha reiniciada con éxito. La visita vuelve a estar programada.',
      );
      onCerrar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la acción excepcional';
      setErrorLocal(msg);
      toast.error(msg);
    } finally {
      setEnviando(false);
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
              <h3 className="text-base font-bold text-text">Trámite Excepcional de Monitoreo</h3>
              <p className="text-xs text-text-muted">Resolución con sustento formal de Mesa de Partes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          {/* Cuerpo con scroll independiente */}
          <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
            {/* Datos del registro */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/80 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex justify-between sm:flex-col sm:gap-0.5">
                <span className="text-text-muted">Institución:</span>
                <span className="font-semibold text-text truncate">{cronograma.institucion}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-0.5">
                <span className="text-text-muted">Evaluado:</span>
                <span className="font-semibold text-text truncate">{cronograma.docenteDirectivo}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-0.5">
                <span className="text-text-muted">Visita N.°:</span>
                <span className="font-bold text-text">{cronograma.nroVisita} ({cronograma.tipo})</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-0.5">
                <span className="text-text-muted">Estado actual:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{cronograma.estado}</span>
              </div>
            </div>

            {/* Selector de acción */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text uppercase tracking-wider">
                Tipo de Acción Excepcional
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    tipoAccion === 'ANULACION_TOTAL'
                      ? 'border-destructive/60 bg-destructive/10'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoAccion"
                    value="ANULACION_TOTAL"
                    checked={tipoAccion === 'ANULACION_TOTAL'}
                    onChange={() => setTipoAccion('ANULACION_TOTAL')}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text">Anulación Total del Monitoreo</span>
                    <span className="text-[11px] text-text-muted leading-tight">
                      Invalida definitivamente la visita y su ficha. Deja de sumar en reportes y libera la visita.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    tipoAccion === 'REAPERTURA_FICHA'
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoAccion"
                    value="REAPERTURA_FICHA"
                    checked={tipoAccion === 'REAPERTURA_FICHA'}
                    onChange={() => setTipoAccion('REAPERTURA_FICHA')}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text">Reapertura / Reinicio de Ficha</span>
                    <span className="text-[11px] text-text-muted leading-tight">
                      Elimina la ficha errónea y regresa la visita a PROGRAMADO para permitir volver a llenarla.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Expediente / Trámite */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expediente" className="text-xs font-bold text-text">
                N.° de Expediente / Trámite de Mesa de Partes <span className="text-destructive">*</span>
              </label>
              <input
                id="expediente"
                type="text"
                value={numeroExpediente}
                onChange={(e) => setNumeroExpediente(e.target.value)}
                placeholder="Ej. OFICIO N° 045-2026-IE o EXP-2026-00452"
                className="px-3.5 py-2 text-xs bg-bg border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/50 text-text"
                required
              />
            </div>

            {/* Documento de Sustento (PDF) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text">
                Documento de Sustento (PDF) <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3.5 py-2 bg-muted/60 hover:bg-muted text-xs font-semibold text-text rounded-xl border border-border cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>Adjuntar archivo PDF</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {archivoNombre ? (
                  <span className="text-xs text-text truncate max-w-[240px] flex items-center gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    {archivoNombre}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">Ningún archivo seleccionado</span>
                )}
              </div>
            </div>

            {/* Motivo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="motivo" className="text-xs font-bold text-text">
                Motivo / Justificación detallada <span className="text-destructive">*</span>
              </label>
              <textarea
                id="motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Indique los antecedentes y la razón legal o técnica por la que se autoriza esta acción..."
                className="px-3.5 py-2 text-xs bg-bg border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/50 text-text resize-none"
                required
              />
            </div>

            {/* Alerta de advertencia */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Esta acción queda registrada en el sistema con fines de auditoría y no puede deshacerse de forma automática.
              </span>
            </div>

            {errorLocal && (
              <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {errorLocal}
              </p>
            )}
          </div>

          {/* Botones de acción fijados en el pie */}
          <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-border shrink-0 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={onCerrar}
              disabled={enviando}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando}
              className={`text-xs font-bold text-white transition-colors cursor-pointer ${
                tipoAccion === 'ANULACION_TOTAL'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {enviando && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {tipoAccion === 'ANULACION_TOTAL'
                ? 'Confirmar Anulación Total'
                : 'Confirmar Reapertura de Ficha'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
