import { FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import type { FormularioCronograma } from '@features/cronogramas/lib/formulario';
import type { OpcionesDelFormulario, PerfilDelFormulario } from './tipos-del-formulario';
import { CamposDeAsignacion } from './CamposDeAsignacion';
import { CamposDeEvaluacion } from './CamposDeEvaluacion';

/**
 * Registro y edición de una visita de monitoreo.
 *
 * Eran 336 líneas con los tres bloques del formulario y sus condicionales por
 * perfil entremezclados. Acá queda el marco del diálogo y el envío.
 */

interface ModalCronogramaProps {
  form: FormularioCronograma;
  onCambiar: <K extends keyof FormularioCronograma>(
    campo: K,
    valor: FormularioCronograma[K],
  ) => void;
  opciones: OpcionesDelFormulario;
  perfil: PerfilDelFormulario;
  /** En edición no se cambian fecha ni número: la visita ya está emitida. */
  esEdicion: boolean;
  envio: { error: string | null; enviando: boolean };
  onEnviar: (e: React.FormEvent) => void;
  onCerrar: () => void;
}

export const ModalCronograma = ({
  form,
  onCambiar,
  opciones,
  perfil,
  esEdicion,
  envio,
  onEnviar,
  onCerrar,
}: ModalCronogramaProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
    <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {esEdicion ? 'Editar Cronograma' : 'Registro de Cronograma'}
          </h3>
          <p className="text-xs text-text-muted">
            Complete los datos para {esEdicion ? 'actualizar' : 'programar'} una visita de
            monitoreo.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="p-1.5 hover:bg-muted text-text-muted hover:text-text rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onEnviar} className="flex flex-col overflow-y-auto flex-1">
        <div className="p-6 flex flex-col gap-5">
          {envio.error && (
            <div className="flex items-start gap-2 bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-700 text-sm font-semibold shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-extrabold uppercase tracking-wide text-xs mb-1">
                  No se pudo guardar el cronograma
                </p>
                <p className="font-normal">{envio.error}</p>
              </div>
            </div>
          )}

          <CamposDeAsignacion
            form={form}
            onCambiar={onCambiar}
            opciones={opciones}
            perfil={perfil}
          />

          <CamposDeEvaluacion
            form={form}
            onCambiar={onCambiar}
            opciones={opciones}
            perfil={perfil}
            esEdicion={esEdicion}
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={onCerrar}
            className="cursor-pointer border-border"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={envio.enviando}
            className="bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition-colors"
          >
            {envio.enviando ? 'Guardando…' : 'Guardar Cronograma'}
          </Button>
        </div>
      </form>
    </div>
  </div>
);
