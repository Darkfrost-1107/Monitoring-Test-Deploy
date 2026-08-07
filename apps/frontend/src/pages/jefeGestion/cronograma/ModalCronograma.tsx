import { FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { SelectField } from '@shared/ui/form-controls';
import { ESTADOS_VISITA } from '@sistema-monitoreo/shared-contracts';
import type { Cronograma } from '@entities/model-cronogramas';
import type { FormularioCronograma } from '@features/cronogramas/lib/formulario';
import { SelectorNumeroVisita, type BotonVisita } from './SelectorNumeroVisita';

type Opcion = { value: string; label: string };

/** Todo lo que el formulario puede ofrecer, ya filtrado por la cascada. */
export interface OpcionesDelFormulario {
  modalidades: string[];
  niveles: string[];
  especialistas: Opcion[];
  instituciones: Opcion[];
  evaluados: Opcion[];
  evaluadores: Opcion[];
  visitas: BotonVisita[];
}

/** Qué puede editar quien está usando el formulario. */
export interface PerfilDelFormulario {
  /** El director trabaja en un solo colegio: no elige modalidad ni institución. */
  esDirector: boolean;
  /** Sólo en Secundaria existen los cargos que pueden evaluar además del director. */
  esSecundaria: boolean;
  /** Coordinador o jefe de taller: se evalúa a sí mismo, no elige evaluador. */
  esCoordinadorOTaller: boolean;
}

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

const CLASES_CAMPO_FIJO =
  'bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-lg text-sm shadow-inner leading-none h-10 flex items-center';

/** Derivadas del contrato: un estado nuevo aparece solo, sin tocar esta lista. */
const OPCIONES_ESTADO: Opcion[] = ESTADOS_VISITA.map((estado) => ({
  value: estado,
  label: estado,
}));

/** Campo de sólo lectura, para lo que el perfil no elige. */
const CampoFijo = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-text-muted">{etiqueta}</label>
    <div className={CLASES_CAMPO_FIJO}>{valor}</div>
  </div>
);

/** Registro y edición de una visita de monitoreo. */
export const ModalCronograma = ({
  form,
  onCambiar,
  opciones,
  perfil,
  esEdicion,
  envio,
  onEnviar,
  onCerrar,
}: ModalCronogramaProps) => {
  const faltaCascada = !form.modalidad || !form.nivel;

  const marcadorDeLista = (vacio: string, lleno: string, cantidad: number) =>
    faltaCascada ? 'Seleccione modalidad y nivel...' : cantidad === 0 ? vacio : lleno;

  return (
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
            onClick={onCerrar}
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

            {!perfil.esDirector && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField
                    label="Modalidad Educativa *"
                    value={form.modalidad}
                    onChange={(valor) => onCambiar('modalidad', valor)}
                    placeholder="Seleccionar modalidad..."
                    options={opciones.modalidades.map((m) => ({ value: m, label: m }))}
                  />
                  <SelectField
                    label="Nivel Educativo *"
                    value={form.nivel}
                    onChange={(valor) => onCambiar('nivel', valor)}
                    placeholder={
                      form.modalidad ? 'Seleccionar nivel...' : 'Seleccione modalidad primero'
                    }
                    options={opciones.niveles.map((n) => ({ value: n, label: n }))}
                  />
                </div>

                {faltaCascada && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl p-3 text-primary text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Seleccione modalidad y nivel educativo para habilitar la selección de
                      especialista e institución.
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                {perfil.esDirector ? (
                  perfil.esSecundaria ? (
                    <SelectField
                      label="Evaluador *"
                      value={form.especialista}
                      onChange={(valor) => onCambiar('especialista', valor)}
                      placeholder="Seleccionar evaluador..."
                      options={opciones.evaluadores}
                      disabled={perfil.esCoordinadorOTaller}
                    />
                  ) : (
                    <CampoFijo etiqueta="Evaluador *" valor={form.especialista} />
                  )
                ) : (
                  <>
                    <SelectField
                      label="Especialista (filtro por nivel) *"
                      value={form.especialista}
                      onChange={(valor) => onCambiar('especialista', valor)}
                      placeholder={marcadorDeLista(
                        'No hay especialistas para este nivel',
                        'Seleccionar especialista...',
                        opciones.especialistas.length,
                      )}
                      options={opciones.especialistas}
                    />
                    {!faltaCascada && opciones.especialistas.length > 0 && (
                      <span className="text-[10px] text-text-muted pl-1">
                        {opciones.especialistas.length} especialista(s) de {form.modalidad} -{' '}
                        {form.nivel}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {perfil.esDirector ? (
                  <CampoFijo etiqueta="Institución Educativa *" valor={form.institucion} />
                ) : (
                  <>
                    <SelectField
                      label="Institución Educativa (filtro) *"
                      value={form.institucion}
                      onChange={(valor) => onCambiar('institucion', valor)}
                      placeholder={marcadorDeLista(
                        'No hay instituciones para este nivel',
                        'Seleccionar institución...',
                        opciones.instituciones.length,
                      )}
                      options={opciones.instituciones}
                    />
                    {!faltaCascada && opciones.instituciones.length > 0 && (
                      <span className="text-[10px] text-text-muted pl-1">
                        {opciones.instituciones.length} institución(es) de {form.modalidad} -{' '}
                        {form.nivel}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {!perfil.esDirector && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted">Tipo de Monitoreo *</label>
                <div className="flex items-center gap-0 rounded-xl border border-border overflow-hidden w-fit">
                  {(['DOCENTE', 'DIRECTIVO'] as const).map((tipo, idx) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => onCambiar('tipo', tipo)}
                      className={`px-6 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                        idx > 0 ? 'border-l border-border' : ''
                      } ${
                        form.tipo === tipo
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface text-text-muted hover:bg-muted/60'
                      }`}
                    >
                      {tipo === 'DOCENTE' ? 'Docente' : 'Directivo'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {perfil.esDirector ? (
              <SelectField
                label="Docente a Evaluar *"
                value={form.docente}
                onChange={(valor) => onCambiar('docente', valor)}
                placeholder="Seleccionar docente..."
                options={opciones.evaluados}
              />
            ) : (
              <SelectField
                label={`Seleccionar ${form.tipo === 'DOCENTE' ? 'Docente' : 'Directivo'} a Evaluar *`}
                value={form.docente}
                onChange={(valor) => onCambiar('docente', valor)}
                placeholder={
                  !form.institucion
                    ? 'Seleccione institución primero...'
                    : opciones.evaluados.length === 0
                      ? `No hay ${form.tipo === 'DOCENTE' ? 'docentes' : 'directivos'} para esta institución`
                      : 'Seleccionar...'
                }
                disabled={!form.institucion}
                options={opciones.evaluados}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-muted">
                  Fecha y Hora Programada *
                </label>
                <input
                  type="datetime-local"
                  value={form.fechaHora}
                  onChange={(e) => onCambiar('fechaHora', e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium text-text placeholder:text-text-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={esEdicion}
                />
                {esEdicion && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Para cambiar fecha/hora, use Solicitud de Reprogramación desde el calendario.
                  </span>
                )}
              </div>

              <SelectorNumeroVisita
                botones={opciones.visitas}
                seleccionado={form.visita}
                onSeleccionar={(valor) => onCambiar('visita', valor)}
                bloqueado={esEdicion}
              />
            </div>

            {esEdicion && (
              <SelectField
                label="Estado de Visita *"
                value={form.estado}
                onChange={(valor) => onCambiar('estado', valor as Cronograma['estado'])}
                placeholder="Seleccionar estado..."
                options={OPCIONES_ESTADO}
              />
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                Detalles / Observaciones (opcional)
              </label>
              <textarea
                value={form.observaciones}
                onChange={(e) => onCambiar('observaciones', e.target.value)}
                placeholder="Escriba cualquier detalle adicional o instrucciones..."
                rows={3}
                className="flex w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm ring-offset-background text-text placeholder:text-text-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
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
};
