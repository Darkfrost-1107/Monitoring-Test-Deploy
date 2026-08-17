import { SelectField } from '@shared/ui/form-controls';
import type { Cronograma } from '@entities/model-cronogramas';
import { ESTADOS_VISITA } from '@sistema-monitoreo/shared-contracts';
import type { FormularioCronograma } from '@features/cronogramas/lib/formulario';
import type { OpcionesDelFormulario, PerfilDelFormulario } from './tipos-del-formulario';
import { SelectorNumeroVisita } from './SelectorNumeroVisita';

/**
 * A quién se evalúa, cuándo y con qué número de visita.
 *
 * Eran ciento veinte líneas dentro de `ModalCronograma`.
 */

/** Derivadas del contrato: un estado nuevo aparece solo, sin tocar esta lista. */
const OPCIONES_ESTADO = ESTADOS_VISITA.map((estado) => ({ value: estado, label: estado }));

const TIPOS = [
  { valor: 'DOCENTE' as const, rotulo: 'Docente' },
  // «Director», no «Directivo»: un solo nombre para el cargo en todo el
  // sistema —padrón, designación, focos de atención y avisos—.
  { valor: 'DIRECTIVO' as const, rotulo: 'Director' },
] as const;

interface Props {
  form: FormularioCronograma;
  onCambiar: <K extends keyof FormularioCronograma>(
    campo: K,
    valor: FormularioCronograma[K],
  ) => void;
  opciones: OpcionesDelFormulario;
  perfil: PerfilDelFormulario;
  esEdicion: boolean;
}

export const CamposDeEvaluacion = ({ form, onCambiar, opciones, perfil, esEdicion }: Props) => (
  <>
    {!perfil.esDirector && (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-text-muted">Tipo de Monitoreo *</label>
        <div className="flex items-center gap-0 rounded-xl border border-border overflow-hidden w-fit">
          {TIPOS.map(({ valor, rotulo }, indice) => (
            <button
              key={valor}
              type="button"
              onClick={() => onCambiar('tipo', valor)}
              className={`px-6 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                indice > 0 ? 'border-l border-border' : ''
              } ${
                form.tipo === valor
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface text-text-muted hover:bg-muted/60'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
    )}

    <SelectField
      label={
        perfil.esDirector
          ? 'Docente a Evaluar *'
          : `Seleccionar ${form.tipo === 'DOCENTE' ? 'Docente' : 'Director'} a Evaluar *`
      }
      value={form.evaluadoId}
      onChange={(valor) => onCambiar('evaluadoId', valor)}
      placeholder={marcadorDeEvaluado(form, opciones, perfil)}
      disabled={!perfil.esDirector && !form.institucionId}
      options={opciones.evaluados}
    />

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha-programada" className="text-xs font-bold text-text-muted">
          Fecha y Hora Programada *
        </label>
        <input
          id="fecha-programada"
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
  </>
);

/** Por qué la lista de evaluados está como está. */
function marcadorDeEvaluado(
  form: FormularioCronograma,
  opciones: OpcionesDelFormulario,
  perfil: PerfilDelFormulario,
): string {
  if (perfil.esDirector) return 'Seleccionar docente...';
  if (!form.institucionId) return 'Seleccione institución primero...';

  if (opciones.evaluados.length === 0) {
    const quienes = form.tipo === 'DOCENTE' ? 'docentes' : 'directivos';
    return `No hay ${quienes} para esta institución`;
  }

  return 'Seleccionar...';
}
