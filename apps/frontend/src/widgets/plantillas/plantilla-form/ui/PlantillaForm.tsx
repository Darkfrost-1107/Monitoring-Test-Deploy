import { useState } from 'react';
import { FormButton } from '@shared/ui/form-controls';
import { nivelesPorDefecto, baremoPorDefecto, crearDesempenoVacio } from '@entities/model-plantillas';
import type { Baremo, NivelCalificacion, Desempeno, EjeItem } from '@entities/model-plantillas';
import { useLemaDelAnio } from '@entities/model-lemas';
import { validarLema } from '@features/plantillas/lib/campo-lema';
import { PlantillaCabecera } from './PlantillaCabecera';
import { PlantillaDesempenos } from './PlantillaDesempenos';
import { PlantillaEjesItems } from './PlantillaEjesItems';

export interface PlantillaFormState {
  tipoMonitoreo: string;
  anioAcademico: number;
  /**
   * Lema oficial del año. No se guarda con la plantilla: viaja acá para que
   * quien envía el formulario lo persista contra el año.
   */
  lema: string;
  baremo: Baremo;
  niveles: NivelCalificacion[];
  desempenos: Desempeno[];
  ejeItems: EjeItem[];
}

interface Props {
  onCancel: () => void;
  onSubmit: (data: PlantillaFormState) => void;
  isSaving?: boolean;
}

export const PlantillaForm = ({ onCancel, onSubmit, isSaving = false }: Props) => {
  const [form, setForm] = useState<PlantillaFormState>(() => ({
    tipoMonitoreo: 'Monitoreo Docente',
    anioAcademico: new Date().getFullYear(),
    lema: '',
    baremo: baremoPorDefecto('Monitoreo Docente'),
    niveles: nivelesPorDefecto('Monitoreo Docente'),
    desempenos: [crearDesempenoVacio()],
    ejeItems: [],
  }));
  const [errorDeLema, setErrorDeLema] = useState<string | null>(null);

  const esDirectivo = form.tipoMonitoreo === 'Monitoreo Directivo';

  /**
   * Cambiar el tipo de monitoreo repone la escala y su modo de lectura.
   *
   * La docente corta sobre el puntaje (5·8·13·18) y la directiva sobre el
   * porcentaje de avance (25·50·75·100): conservar los números anteriores
   * dejaría la plantilla clasificando con la rúbrica equivocada, y conservar el
   * modo sería peor todavía —leer 25·50·75·100 como puntajes deja todo en el
   * primer nivel—. Quien quiera otros cortes los edita después.
   */
  const patch = (p: Partial<PlantillaFormState>) =>
    setForm((prev) => {
      const cambiaDeTipo = !!p.tipoMonitoreo && p.tipoMonitoreo !== prev.tipoMonitoreo;

      return {
        ...prev,
        ...p,
        ...(cambiaDeTipo
          ? {
              niveles: nivelesPorDefecto(p.tipoMonitoreo!),
              baremo: baremoPorDefecto(p.tipoMonitoreo!),
              // La ficha directiva no lleva planificación y diseño de
              // evaluación: conservar los ítems los dejaría guardados en una
              // plantilla que nunca los va a mostrar.
              ...(p.tipoMonitoreo === 'Monitoreo Directivo' ? { ejeItems: [] } : {}),
            }
          : {}),
      };
    });

  const { data: lemaDelAnio, isLoading: cargandoLema } = useLemaDelAnio(form.anioAcademico);
  const lemaGuardado = lemaDelAnio?.lema ?? null;

  /**
   * Lo tipeado recuerda a qué año pertenece.
   *
   * Así el valor vigente se **deriva** en vez de sincronizarse con un efecto:
   * al cambiar de año el borrador deja de corresponder y el campo vuelve solo a
   * lo que ese año tenga guardado, sin arrastrar el texto del año anterior.
   */
  const [borradorLema, setBorradorLema] = useState<{ anio: number; texto: string } | null>(null);
  const lemaVigente =
    borradorLema?.anio === form.anioAcademico ? borradorLema.texto : (lemaGuardado ?? '');

  /**
   * El lema es obligatorio: sin él la ficha impresa sale sin el encabezado
   * oficial del año, y ese encabezado es parte del documento, no un adorno.
   */
  const enviar = () => {
    const falta = validarLema(lemaVigente);
    setErrorDeLema(falta);
    if (falta) return;

    onSubmit({ ...form, lema: lemaVigente.trim() });
  };

  return (
    <div className="flex flex-col gap-5">
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
      />

      <PlantillaDesempenos
        desempenos={form.desempenos}
        niveles={form.niveles}
        onChange={(desempenos) => patch({ desempenos })}
      />

      {/* Sólo el instrumento docente lleva esta sección. Antes se ofrecía
          siempre y sólo lo advertía el título, de modo que una plantilla
          directiva podía quedar con ítems que su ficha no muestra. */}
      {!esDirectivo && (
        <PlantillaEjesItems
          ejeItems={form.ejeItems}
          onChange={(ejeItems) => patch({ ejeItems })}
        />
      )}

      {errorDeLema && (
        <p role="alert" className="text-sm text-destructive text-right">
          {errorDeLema}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <FormButton variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </FormButton>
        <FormButton onClick={enviar} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
        </FormButton>
      </div>
    </div>
  );
};
