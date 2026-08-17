import { useMemo, useState } from 'react';
import type { Plantilla } from '@/entities/model-plantillas';
import { ListaDesempenos } from './ListaDesempenos';
import { DetalleDesempeno } from './DetalleDesempeno';

/** Lo respondido sobre cada desempeño, indexado por su identificador. */
export interface RespuestasDesempenos {
  niveles: Record<string, string>;
  preguntasExtra: Record<string, boolean>;
  observaciones: Record<string, string>;
}

interface PanelDesempenosProps {
  template: Plantilla;
  respuestas: RespuestasDesempenos;
  onElegirNivel: (desempenoId: string, nivel: string) => void;
  onResponderExtra: (desempenoId: string, respuesta: boolean) => void;
  onObservar: (desempenoId: string, texto: string) => void;
  /** Los aspectos son del monitoreo a docente; el directivo no los lleva. */
  mostrarAspectos: boolean;
  soloLectura: boolean;
}

/**
 * Calificación de los desempeños: índice a la izquierda, rúbrica a la derecha.
 *
 * Qué desempeño está abierto es asunto de este panel y no del formulario: no
 * viaja al guardar ni afecta a ninguna otra sección.
 */
export const PanelDesempenos = ({
  template,
  respuestas,
  onElegirNivel,
  onResponderExtra,
  onObservar,
  mostrarAspectos,
  soloLectura,
}: PanelDesempenosProps) => {
  const [elegidoId, setElegidoId] = useState('');

  // El desempeño abierto se deriva, no se guarda: si la plantilla cambia y el
  // elegido ya no existe, se cae al primero sin necesidad de un efecto que
  // corrija el estado después de renderizar.
  const abierto = useMemo(
    () =>
      template.desempenos.find((d) => d.id === elegidoId) ?? template.desempenos[0] ?? null,
    [template, elegidoId],
  );

  const esEib =
    template.tipoMonitoreo === 'DOCENTE_EIB' ||
    template.tipoMonitoreo.toUpperCase().includes('EIB');

  const indiceActual = abierto
    ? template.desempenos.findIndex((d) => d.id === abierto.id)
    : 0;
  const totalDesempenos = template.desempenos.length;
  const tieneAnterior = indiceActual > 0;
  const tieneSiguiente = indiceActual >= 0 && indiceActual < totalDesempenos - 1;

  const totalEvaluados = useMemo(() => {
    return template.desempenos.filter((d) => !!respuestas.niveles[d.id]).length;
  }, [template.desempenos, respuestas.niveles]);

  const onAnterior = tieneAnterior
    ? () => setElegidoId(template.desempenos[indiceActual - 1].id)
    : undefined;

  const onSiguiente = tieneSiguiente
    ? () => setElegidoId(template.desempenos[indiceActual + 1].id)
    : undefined;

  return (
    <div className="flex flex-col md:flex-row min-h-[300px] items-start border-b border-border bg-white">
      <ListaDesempenos
        desempenos={template.desempenos}
        seleccionadoId={abierto?.id ?? ''}
        nivelesElegidos={respuestas.niveles}
        onSeleccionar={setElegidoId}
      />

      <DetalleDesempeno
        desempeno={abierto}
        niveles={template.niveles}
        respuesta={{
          nivel: abierto ? respuestas.niveles[abierto.id] : undefined,
          preguntaExtra: abierto ? respuestas.preguntasExtra[abierto.id] : undefined,
          observacion: abierto ? (respuestas.observaciones[abierto.id] ?? '') : '',
        }}
        onElegirNivel={(nivel) => abierto && onElegirNivel(abierto.id, nivel)}
        onResponderExtra={(valor) => abierto && onResponderExtra(abierto.id, valor)}
        onObservar={(texto) => abierto && onObservar(abierto.id, texto)}
        mostrarAspectos={mostrarAspectos}
        soloLectura={soloLectura}
        esEib={esEib}
        indiceActual={indiceActual}
        totalDesempenos={totalDesempenos}
        totalEvaluados={totalEvaluados}
        onAnterior={onAnterior}
        onSiguiente={onSiguiente}
      />
    </div>
  );
};
