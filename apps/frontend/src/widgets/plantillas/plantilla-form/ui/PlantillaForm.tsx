import { useState } from 'react';
import { FormButton } from '@shared/ui/form-controls';
import { nivelesPorDefecto, baremoPorDefecto, crearDesempenoVacio } from '@entities/model-plantillas';
import type { Baremo, NivelCalificacion, Desempeno, EjeItem } from '@entities/model-plantillas';
import { useLemaDelAnio } from '@entities/model-lemas';
import { validarLema } from '@features/plantillas/lib/campo-lema';
import { PlantillaCabecera } from './PlantillaCabecera';
import { PlantillaDesempenos } from './PlantillaDesempenos';
import { PlantillaEibItems } from './PlantillaEibItems';
import { PlantillaEjesItems } from './PlantillaEjesItems';

export interface PlantillaFormState {
  tipoMonitoreo: string;
  /**
   * Nombre con el que la ficha aparece en el catálogo.
   *
   * Se guarda en `descripcion`, que ya existía en el modelo y sólo llevaba el
   * texto que dejaba el clonador. Sin nombre, todas las fichas del mismo
   * instrumento y año se ven idénticas.
   */
  descripcion: string;
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
  /**
   * Instrumentos que esta persona puede elegir.
   *
   * Para la UGEL, todos. Para una institución, sólo los que tenga autorizados
   * por una solicitud aprobada: el catálogo oficial es obligatorio y una ficha
   * propia no se crea porque se quiera.
   */
  instrumentosPermitidos?: readonly string[];
}

export const PlantillaForm = ({ onCancel, onSubmit, isSaving = false, instrumentosPermitidos}: Props) => {
  const [form, setForm] = useState<PlantillaFormState>(() => ({
    tipoMonitoreo: 'Monitoreo Docente',
    descripcion: '',
    anioAcademico: new Date().getFullYear(),
    lema: '',
    baremo: baremoPorDefecto('Monitoreo Docente'),
    niveles: nivelesPorDefecto('Monitoreo Docente'),
    desempenos: [crearDesempenoVacio()],
    ejeItems: [],
  }));
  const [errorDeLema, setErrorDeLema] = useState<string | null>(null);

  const esDirectivo = form.tipoMonitoreo === 'Monitoreo Directivo';
  const esEib = form.tipoMonitoreo === 'Monitoreo Docente EIB';

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
              // Ni directivo ni EIB llevan la sección de ejes/ítems separada
              ...(p.tipoMonitoreo !== 'Monitoreo Docente' ? { ejeItems: [] } : {}),
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

    // Los ejes/ítems son opcionales: se descartan los que quedaron sin describir
    // y se renumeran, para no enviar al backend un eje vacío que rechaza con 400.
    const ejeItems = form.ejeItems
      .filter((it) => it.descripcion.trim() !== '')
      .map((it, i) => ({ ...it, numero: i + 1 }));
    onSubmit({ ...form, ejeItems, lema: lemaVigente.trim() });
  };

  return (
    <div className="flex flex-col gap-5">
      <PlantillaCabecera
        tipoMonitoreo={form.tipoMonitoreo}
        descripcion={form.descripcion}
        instrumentosPermitidos={instrumentosPermitidos}
        anioAcademico={form.anioAcademico}
        lema={lemaVigente}
        lemaGuardado={lemaGuardado}
        cargandoLema={cargandoLema}
        onLemaChange={(texto) => setBorradorLema({ anio: form.anioAcademico, texto })}
        baremo={form.baremo}
        niveles={form.niveles}
        onChange={patch}
      />

      {esEib ? (
        <PlantillaEibItems
          criterios={form.desempenos}
          onChange={(desempenos) => patch({ desempenos })}
        />
      ) : (
        <PlantillaDesempenos
          desempenos={form.desempenos}
          niveles={form.niveles}
          esDirectivo={esDirectivo}
          onChange={(desempenos) => patch({ desempenos })}
        />
      )}

      {/* Sólo el instrumento docente regular lleva esta sección. */}
      {!esDirectivo && !esEib && (
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
