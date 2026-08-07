import { X, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { TextField, SelectField } from '@shared/ui/form-controls';
import { pesoEnMegas } from '@features/planes-monitoreo/lib/archivo-plan';

/**
 * Formulario de registro de un plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran ciento veinticinco líneas al final de
 * `PlanMonitoreoAnualPage`.
 */

const ID_CAMPO_ARCHIVO = 'pdf-file-input';

interface ModalSubirPlanProps {
  titulo: string;
  onTituloChange: (v: string) => void;
  anio: string;
  onAnioChange: (v: string) => void;
  opcionesAnio: { value: string; label: string }[];
  entidad: 'UGEL' | 'IE';
  estado: 'Activo' | 'Inactivo';
  onEstadoChange: (v: 'Activo' | 'Inactivo') => void;
  archivo: File | null;
  onArchivoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Ya se intentó enviar: recién entonces se marcan los campos faltantes. */
  intentoDeEnvio: boolean;
  error: string | null;
  guardando: boolean;
  onEnviar: (e: React.FormEvent) => void;
  onCerrar: () => void;
}

export const ModalSubirPlan = ({
  titulo,
  onTituloChange,
  anio,
  onAnioChange,
  opcionesAnio,
  entidad,
  estado,
  onEstadoChange,
  archivo,
  onArchivoChange,
  intentoDeEnvio,
  error,
  guardando,
  onEnviar,
  onCerrar,
}: ModalSubirPlanProps) => {
  const faltaArchivo = intentoDeEnvio && !archivo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-text">Registrar Plan de Monitoreo</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1 hover:bg-muted text-text-muted hover:text-text rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onEnviar} className="p-5 flex flex-col gap-4">
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <TextField
            label="Título del Plan *"
            value={titulo}
            onChange={onTituloChange}
            placeholder="Ej. Plan Anual de Monitoreo UGEL 2024"
            error={intentoDeEnvio && !titulo.trim() ? 'El título es obligatorio' : ''}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Año Académico *"
              value={anio}
              onChange={onAnioChange}
              placeholder="Seleccionar año..."
              options={opcionesAnio}
            />
            {/* El tipo de entidad lo determina el alcance del usuario, no una
                elección: se muestra para que sepa dónde va a quedar el plan. */}
            <SelectField
              label="Tipo de Entidad *"
              value={entidad}
              onChange={() => {}}
              placeholder="Seleccionar tipo..."
              disabled
              options={[
                { value: 'UGEL', label: 'UGEL' },
                { value: 'IE', label: 'IE' },
              ]}
            />
          </div>

          <SelectField
            label="Estado Inicial"
            value={estado}
            placeholder="Seleccione un estado"
            onChange={(v) => onEstadoChange(v as 'Activo' | 'Inactivo')}
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Documento PDF (Máx. 10MB) *
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                archivo
                  ? 'border-green-500/40 bg-green-500/5'
                  : faltaArchivo
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-border hover:bg-muted/40'
              }`}
              onClick={() => document.getElementById(ID_CAMPO_ARCHIVO)?.click()}
            >
              <FileText className={`w-8 h-8 ${archivo ? 'text-green-500' : 'text-text-muted'}`} />
              {archivo ? (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text line-clamp-1 px-4">
                    {archivo.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {pesoEnMegas(archivo.size)} MB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text">Seleccione un archivo PDF</span>
                  <span className="text-[10px] text-text-muted">
                    Haga clic para buscar en su equipo
                  </span>
                </div>
              )}
              <input
                id={ID_CAMPO_ARCHIVO}
                type="file"
                accept=".pdf"
                onChange={onArchivoChange}
                className="hidden"
              />
            </div>
            {faltaArchivo && (
              <span className="text-xs text-destructive mt-0.5">El archivo PDF es obligatorio</span>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCerrar}
              disabled={guardando}
              className="cursor-pointer border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition-colors"
            >
              {guardando ? 'Guardando...' : 'Guardar Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
