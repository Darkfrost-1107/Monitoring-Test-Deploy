import { useState } from 'react';
import { ChevronDown, ClipboardList, Plus, Trash2, X } from 'lucide-react';
import { FieldLabel, SectionCard, TextField, TextAreaField } from '@shared/ui/form-controls';
import { crearAspectoVacio, crearDesempenoVacio } from '@entities/model-plantillas';
import type { Desempeno, NivelCalificacion, NivelRomano } from '@entities/model-plantillas';

interface Props {
  desempenos: Desempeno[];
  niveles: NivelCalificacion[];
  /**
   * La ficha directiva es sólo rúbrica + observaciones: no lleva descripción
   * corta, pregunta extra ni aspectos, así que esos campos se ocultan del editor.
   */
  esDirectivo?: boolean;
  onChange: (desempenos: Desempeno[]) => void;
}

export const PlantillaDesempenos = ({ desempenos, niveles, esDirectivo = false, onChange }: Props) => {
  // Acordeón: se abre sólo el desempeño que se está editando, para no ver los
  // enunciados de todos a la vez. Arranca con el primero abierto; el resto,
  // plegado.
  const [abiertos, setAbiertos] = useState<Set<string>>(
    () => new Set(desempenos[0] ? [desempenos[0].id] : []),
  );
  const toggle = (id: string) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const updateDesempeno = (id: string, patch: Partial<Desempeno>) =>
    onChange(desempenos.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const removeDesempeno = (id: string) => onChange(desempenos.filter((d) => d.id !== id));

  // El desempeño recién agregado se abre para llenarlo de una.
  const addDesempeno = () => {
    const nuevo = crearDesempenoVacio();
    onChange([...desempenos, nuevo]);
    setAbiertos((prev) => new Set(prev).add(nuevo.id));
  };

  return (
    <SectionCard icon={<ClipboardList className="w-5 h-5" />} title="2. Gestión de Desempeños">
      <div className="flex flex-col gap-4">
        {desempenos.map((desempeno, index) => (
          <DesempenoCard
            key={desempeno.id}
            index={index}
            desempeno={desempeno}
            niveles={niveles}
            esDirectivo={esDirectivo}
            abierto={abiertos.has(desempeno.id)}
            onToggle={() => toggle(desempeno.id)}
            puedeEliminar={desempenos.length > 1}
            onChange={(patch) => updateDesempeno(desempeno.id, patch)}
            onRemove={() => removeDesempeno(desempeno.id)}
          />
        ))}

        <button
          type="button"
          onClick={addDesempeno}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border py-6 text-text-muted transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm font-semibold">Agregar Nuevo Desempeño</span>
          <span className="text-xs">Permite definir criterios, aspectos y rúbrica por niveles</span>
        </button>
      </div>
    </SectionCard>
  );
};

interface DesempenoCardProps {
  index: number;
  desempeno: Desempeno;
  niveles: NivelCalificacion[];
  esDirectivo: boolean;
  abierto: boolean;
  onToggle: () => void;
  puedeEliminar: boolean;
  onChange: (patch: Partial<Desempeno>) => void;
  onRemove: () => void;
}

const DesempenoCard = ({
  index,
  desempeno,
  niveles,
  esDirectivo,
  abierto,
  onToggle,
  puedeEliminar,
  onChange,
  onRemove,
}: DesempenoCardProps) => {
  const setAspecto = (id: string, descripcion: string) =>
    onChange({
      aspectos: desempeno.aspectos.map((a) => (a.id === id ? { ...a, descripcion } : a)),
    });

  const addAspecto = () => onChange({ aspectos: [...desempeno.aspectos, crearAspectoVacio()] });

  const removeAspecto = (id: string) =>
    onChange({ aspectos: desempeno.aspectos.filter((a) => a.id !== id) });

  const setRubrica = (nivel: NivelRomano, descripcion: string) =>
    onChange({
      rubrica: (desempeno.rubrica ?? []).map((r) => (r.nivel === nivel ? { ...r, descripcion } : r)),
    });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Encabezado del desempeño: clic para plegar/desplegar. Plegado muestra el
          nombre como referencia, para no ver todos los enunciados a la vez. */}
      <div
        className={`flex items-center justify-between bg-primary/5 px-4 py-3 ${
          abierto ? 'border-b border-border' : ''
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
          aria-expanded={abierto}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
              abierto ? '' : '-rotate-90'
            }`}
          />
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {index + 1}
          </span>
          <span className="text-sm font-bold text-text shrink-0">Desempeño N° {index + 1}</span>
          {!abierto && desempeno.nombre.trim() && (
            <span className="truncate text-xs font-medium text-text-muted">
              · {desempeno.nombre}
            </span>
          )}
        </button>
        {puedeEliminar && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-3 flex shrink-0 items-center gap-1 text-xs font-bold text-destructive transition-colors hover:text-destructive/80 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ELIMINAR
          </button>
        )}
      </div>

      {/* Cuerpo */}
      {abierto && (
      <div className="flex flex-col gap-5 p-4">
        {/* La ficha directiva sólo lleva nombre + rúbrica: ni descripción corta,
            ni pregunta extra, ni aspectos. Para ella el nombre va a ancho completo. */}
        {esDirectivo ? (
          <TextField
            label="Nombre del Desempeño"
            required
            value={desempeno.nombre}
            onChange={(v) => onChange({ nombre: v })}
            placeholder="Ej. Implementa el proyecto educativo institucional..."
          />
        ) : (
          <>
            {/* A ancho completo: los enunciados de docente son largos y a media
                columna se cortaban. */}
            <TextField
              label="Nombre del Desempeño"
              required
              value={desempeno.nombre}
              onChange={(v) => onChange({ nombre: v })}
              placeholder="Ej. Involucra activamente a los estudiantes..."
            />
            <TextAreaField
              label="Descripción"
              value={desempeno.descripcionCorta}
              onChange={(v) => onChange({ descripcionCorta: v })}
              placeholder="Contexto del desempeño..."
              rows={2}
            />

            {/* Pregunta Extra Sí/No */}
            <div className="flex flex-col gap-2">
              <FieldLabel label="Pregunta Extra (Sí/No)" />
              <textarea
                value={desempeno.preguntaExtra}
                onChange={(e) => onChange({ preguntaExtra: e.target.value })}
                placeholder="Ej. ¿El docente faltó el respeto a los estudiantes? (opcional)"
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            {/* Aspectos evaluados */}
            <div className="flex flex-col gap-2">
              <FieldLabel label="Aspectos Evaluados" />
              <div className="grid grid-cols-1 gap-2">
                {desempeno.aspectos.map((aspecto, i) => (
                  <div key={aspecto.id} className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted select-none">
                      {i + 1}.
                    </span>
                    <textarea
                      value={aspecto.descripcion}
                      onChange={(e) => setAspecto(aspecto.id, e.target.value)}
                      placeholder="Describe el aspecto a evaluar"
                      rows={2}
                      className="w-full resize-none [field-sizing:content] rounded-lg border border-input bg-transparent py-2 pl-8 pr-9 text-sm leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => removeAspecto(aspecto.id)}
                      className="absolute right-2 top-2 text-text-muted transition-colors hover:text-destructive cursor-pointer"
                      aria-label="Eliminar aspecto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAspecto}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary hover:text-primary cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                AGREGAR ASPECTO
              </button>
            </div>
          </>
        )}

        {/* Detalle de rúbrica por niveles */}
        <div className="flex flex-col gap-2">
          <FieldLabel label="Descripción de Niveles (Rúbrica)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {niveles.map((nivel) => {
              const entry = desempeno.rubrica?.find((r) => r.nivel === nivel.nivel);
              return (
                <div
                  key={nivel.nivel}
                  className="flex flex-col overflow-hidden rounded-xl border border-border"
                >
                  <div
                    className="px-3 py-1.5 text-xs font-bold text-text flex items-baseline gap-1.5"
                    style={{ backgroundColor: `${nivel.color}26` }}
                  >
                    <span>Nivel {nivel.nivel}</span>
                    {nivel.denominacion && (
                      <span className="font-medium normal-case text-text-muted">
                        · {nivel.denominacion}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={entry?.descripcion ?? ''}
                    onChange={(e) => setRubrica(nivel.nivel, e.target.value)}
                    placeholder="Describa el comportamiento para este nivel..."
                    className="min-h-[90px] resize-none [field-sizing:content] bg-transparent px-3 py-2 text-xs leading-relaxed focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
