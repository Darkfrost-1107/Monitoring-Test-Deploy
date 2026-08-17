import { useState } from 'react';
import { FormButton } from '@shared/ui/form-controls';
import { plantillaSchema } from '@entities/model-plantillas/validator';
import { useLemaDelAnio } from '@entities/model-lemas';
import { validarLema } from '@features/plantillas/lib/campo-lema';
import { PlantillaCabecera } from './PlantillaCabecera';
import { PlantillaDesempenos } from './PlantillaDesempenos';
import { PlantillaEibItems } from './PlantillaEibItems';
import { PlantillaEjesItems } from './PlantillaEjesItems';
import type { PlantillaFormState } from './PlantillaForm';

interface Props {
  initialData: PlantillaFormState;
  onCancel: () => void;
  onSubmit: (data: PlantillaFormState) => void;
  isLoading?: boolean;
}

export const EditarPlantillaForm = ({ initialData, onCancel, onSubmit, isLoading = false }: Props) => {
  const [form, setForm] = useState<PlantillaFormState>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const patch = (p: Partial<PlantillaFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  };

  const { data: lemaDelAnio, isLoading: cargandoLema } = useLemaDelAnio(form.anioAcademico);
  const lemaGuardado = lemaDelAnio?.lema ?? initialData.lema ?? null;

  // Derivado, no sincronizado: el borrador recuerda su año, de modo que sin
  // efecto alguno el campo refleja lo que el año tiene guardado.
  const [borradorLema, setBorradorLema] = useState<{ anio: number; texto: string } | null>(null);
  const lemaVigente =
    borradorLema?.anio === form.anioAcademico ? borradorLema.texto : (lemaGuardado ?? '');

  const handleSubmit = () => {
    setSubmitted(true);

    const faltaLema = validarLema(lemaVigente);
    if (faltaLema) {
      setErrors({ lema: faltaLema });
      return;
    }

    // Validar usando el esquema Zod real del dominio
    const validationResult = plantillaSchema.safeParse(form);

    if (!validationResult.success) {
      const localizedErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        localizedErrors[path] = issue.message;
      });
      setErrors(localizedErrors);
      return;
    }

    setErrors({});
    onSubmit({ ...form, lema: lemaVigente.trim() });
  };

  return (
    <div className="flex flex-col gap-5">
      {submitted && Object.keys(errors).length > 0 && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 text-sm">
          <p className="font-bold mb-1">Por favor, corrige los errores en la rúbrica:</p>
          <ul className="list-disc list-inside">
            {Object.values(errors).slice(0, 3).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {Object.keys(errors).length > 3 && <li>Y otros {Object.keys(errors).length - 3} errores más...</li>}
          </ul>
        </div>
      )}

      <PlantillaCabecera
        tipoMonitoreo={form.tipoMonitoreo}
        anioAcademico={form.anioAcademico}
        lema={lemaVigente}
        lemaGuardado={lemaGuardado}
        cargandoLema={cargandoLema}
        onLemaChange={(texto) => setBorradorLema({ anio: form.anioAcademico, texto })}
        baremo={form.baremo}
        niveles={form.niveles}
        onChange={patch}
        isEditMode={true}
      />

      {form.tipoMonitoreo === 'Monitoreo Docente EIB' ? (
        <PlantillaEibItems
          criterios={form.desempenos}
          onChange={(desempenos) => patch({ desempenos })}
        />
      ) : (
        <PlantillaDesempenos
          desempenos={form.desempenos}
          niveles={form.niveles}
          onChange={(desempenos) => patch({ desempenos })}
        />
      )}

      {/* Sólo el instrumento docente regular lleva esta sección. */}
      {form.tipoMonitoreo === 'Monitoreo Docente' && (
        <PlantillaEjesItems
          ejeItems={form.ejeItems}
          onChange={(ejeItems) => patch({ ejeItems })}
        />
      )}

      <div className="flex justify-end gap-3">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Guardando Cambios...' : 'Modificar Plantilla'}
        </FormButton>
      </div>
    </div>
  );
};