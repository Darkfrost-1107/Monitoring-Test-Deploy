import { useMemo, useRef, useState } from 'react';
import type { Plantilla } from '@/entities/model-plantillas';
import { ListaDesempenos, type PasoCierreTipo } from './ListaDesempenos';
import { DetalleDesempeno } from './DetalleDesempeno';
import { PasoCierre } from './PasoCierre';
import { EjesItemsSeccion } from './EjesItemsSeccion';
import {
  criterioCompleto,
  indiceMaximoAccesible,
  planificacionCompleta,
} from '../../lib/avance-ficha';
import { llevarAlInicio } from '../../lib/scroll-ficha';

/** Lo respondido sobre cada desempeño, indexado por su identificador. */
export interface RespuestasDesempenos {
  niveles: Record<string, string>;
  preguntasExtra: Record<string, boolean>;
  observaciones: Record<string, string>;
}

/** El cierre de la ficha (observaciones, sugerencias, compromisos y evidencia). */
export interface CierreDeFicha {
  observaciones: string;
  sugerencias: string;
  compromisos: string;
  onObservaciones: (texto: string) => void;
  onSugerencias: (texto: string) => void;
  onCompromisos: (texto: string) => void;
  evidencias: Record<string, string>;
  onEvidencias: (siguientes: Record<string, string>) => void;
  onVerImagen: (url: string) => void;
}

/**
 * Planificación y diseño de la evaluación: un paso entre los criterios y el
 * cierre. Sólo la lleva la ficha docente; sin esta prop, el paso no existe.
 */
export interface PlanificacionDeFicha {
  items: NonNullable<Plantilla['ejesItems']>;
  niveles: Plantilla['niveles'];
  respuestas: Record<string, number>;
  observaciones: Record<string, string>;
  onResponder: (itemId: string, nivel: number) => void;
  onObservar: (itemId: string, texto: string) => void;
}

interface PanelDesempenosProps {
  template: Plantilla;
  respuestas: RespuestasDesempenos;
  onElegirNivel: (desempenoId: string, nivel: string) => void;
  onResponderExtra: (desempenoId: string, respuesta: boolean) => void;
  onObservar: (desempenoId: string, texto: string) => void;
  /** Los aspectos son del monitoreo a docente; el directivo no los lleva. */
  mostrarAspectos: boolean;
  /** Paso opcional entre los criterios y el cierre. */
  planificacion?: PlanificacionDeFicha;
  /** El cierre vive dentro del panel como un paso posterior a los criterios. */
  cierre: CierreDeFicha;
  soloLectura: boolean;
}

/** Clave del único paso de cierre en la secuencia del wizard. */
const CLAVE_CIERRE = 'cierre';
const CLAVE_PLANIFICACION = 'planificacion';
const PREFIJO_CRITERIO = 'criterio:';

/**
 * Escenario de llenado de la ficha: índice a la izquierda, contenido a la
 * derecha. El índice ya no navega sólo los criterios: encadena también el
 * cierre, de modo que «Siguiente» lleva del último criterio a una única
 * sección con observaciones, sugerencias, compromisos y evidencia —antes
 * vivían al pie del formulario y se olvidaban—.
 *
 * Qué paso está abierto es asunto de este panel y no del formulario: no viaja
 * al guardar ni afecta a ninguna otra sección.
 */
export const PanelDesempenos = ({
  template,
  respuestas,
  onElegirNivel,
  onResponderExtra,
  onObservar,
  mostrarAspectos,
  planificacion,
  cierre,
  soloLectura,
}: PanelDesempenosProps) => {
  const raiz = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState('');
  // Campo del cierre a resaltar/saltar al entrar desde el índice.
  const [focoCierre, setFocoCierre] = useState<PasoCierreTipo>('obs');

  const esEib =
    template.tipoMonitoreo === 'DOCENTE_EIB' ||
    template.instrumento === 'DOCENTE_EIB';

  // La secuencia del wizard: un paso por criterio, la planificación si la ficha
  // la lleva, y por último el cierre (uno solo).
  const claves = useMemo(
    () => [
      ...template.desempenos.map((d) => `${PREFIJO_CRITERIO}${d.id}`),
      ...(planificacion ? [CLAVE_PLANIFICACION] : []),
      CLAVE_CIERRE,
    ],
    [template.desempenos, planificacion],
  );

  // El paso abierto se deriva, no se guarda: si la plantilla cambia y el elegido
  // ya no existe, se cae al primero sin un efecto que corrija tras renderizar.
  const activoResuelto = claves.includes(activo) ? activo : (claves[0] ?? '');
  const indice = Math.max(0, claves.indexOf(activoResuelto));
  const enCierre = activoResuelto === CLAVE_CIERRE;
  const enPlanificacion = activoResuelto === CLAVE_PLANIFICACION;

  const criterioActivoId =
    !enCierre && activoResuelto.startsWith(PREFIJO_CRITERIO)
      ? activoResuelto.slice(PREFIJO_CRITERIO.length)
      : null;

  const abierto = template.desempenos.find((d) => d.id === criterioActivoId) ?? null;
  const indiceCriterio = abierto
    ? template.desempenos.findIndex((d) => d.id === abierto.id)
    : 0;
  const totalDesempenos = template.desempenos.length;

  const totalEvaluados = useMemo(
    () => template.desempenos.filter((d) => !!respuestas.niveles[d.id]).length,
    [template.desempenos, respuestas.niveles],
  );

  // Al aterrizar en el cierre con «Siguiente», se arranca desde arriba.
  const irAClave = (clave: string) => {
    if (clave === CLAVE_CIERRE) setFocoCierre('obs');
    setActivo(clave);
    llevarAlInicio(raiz.current);
  };

  // Avance lineal: sólo se llega hasta el primer paso incompleto. Una ficha en
  // lectura es una consulta, y no se le pide nada al que la mira.
  const completos = useMemo(
    () =>
      new Set(
        template.desempenos
          .filter((d) => criterioCompleto(respuestas.niveles[d.id], respuestas.observaciones[d.id]))
          .map((d) => d.id),
      ),
    [template.desempenos, respuestas.niveles, respuestas.observaciones],
  );
  const planificacionHecha = planificacion
    ? planificacionCompleta(planificacion.items, planificacion.respuestas, planificacion.observaciones)
    : true;
  const maximoAccesible = soloLectura
    ? claves.length - 1
    : indiceMaximoAccesible(claves, (clave) => {
        if (clave === CLAVE_CIERRE) return true;
        if (clave === CLAVE_PLANIFICACION) return planificacionHecha;
        return completos.has(clave.slice(PREFIJO_CRITERIO.length));
      });
  const planificacionBloqueada = claves.indexOf(CLAVE_PLANIFICACION) > maximoAccesible;
  const bloqueados = new Set(
    template.desempenos.filter((_, i) => i > maximoAccesible).map((d) => d.id),
  );
  const cierreBloqueado = claves.length - 1 > maximoAccesible;

  const onAnterior = indice > 0 ? () => irAClave(claves[indice - 1]) : undefined;
  const onSiguiente =
    indice < claves.length - 1 && indice + 1 <= maximoAccesible
      ? () => irAClave(claves[indice + 1])
      : undefined;

  const seleccionarPlanificacion = () => {
    if (planificacionBloqueada) return;
    setActivo(CLAVE_PLANIFICACION);
    llevarAlInicio(raiz.current);
  };

  const seleccionarCierre = (paso: PasoCierreTipo) => {
    if (cierreBloqueado) return;
    setFocoCierre(paso);
    setActivo(CLAVE_CIERRE);
  };

  const cierreEstado = {
    observaciones: !!cierre.observaciones.trim(),
    sugerencias: !!cierre.sugerencias.trim(),
    compromisos: !!cierre.compromisos.trim(),
    evidencia: Object.keys(cierre.evidencias).some((clave) => clave.startsWith('GENERAL')),
  };

  return (
    <div
      ref={raiz}
      className="flex flex-col md:flex-row min-h-[300px] items-start border-b border-border bg-white"
    >
      <ListaDesempenos
        desempenos={template.desempenos}
        seleccionadoId={criterioActivoId ?? ''}
        nivelesElegidos={respuestas.niveles}
        completos={completos}
        bloqueados={bloqueados}
        cierreBloqueado={cierreBloqueado}
        esEib={esEib}
        planificacion={
          planificacion
            ? {
                completa: planificacionHecha,
                activa: enPlanificacion,
                bloqueada: planificacionBloqueada,
                onSeleccionar: seleccionarPlanificacion,
              }
            : undefined
        }
        cierre={cierreEstado}
        pasoCierreActivo={enCierre ? focoCierre : null}
        onSeleccionar={(id) => !bloqueados.has(id) && irAClave(`${PREFIJO_CRITERIO}${id}`)}
        onSeleccionarCierre={seleccionarCierre}
      />

      {enCierre ? (
        <PasoCierre
          observaciones={cierre.observaciones}
          sugerencias={cierre.sugerencias}
          compromisos={cierre.compromisos}
          onObservaciones={cierre.onObservaciones}
          onSugerencias={cierre.onSugerencias}
          onCompromisos={cierre.onCompromisos}
          evidencias={cierre.evidencias}
          onEvidencias={cierre.onEvidencias}
          onVerImagen={cierre.onVerImagen}
          soloLectura={soloLectura}
          foco={focoCierre}
        />
      ) : enPlanificacion && planificacion ? (
        <EjesItemsSeccion
          items={planificacion.items}
          niveles={planificacion.niveles}
          respuestas={planificacion.respuestas}
          observaciones={planificacion.observaciones}
          onResponder={planificacion.onResponder}
          onObservar={planificacion.onObservar}
          soloLectura={soloLectura}
          completa={planificacionHecha}
          onAnterior={onAnterior}
          onSiguiente={onSiguiente}
        />
      ) : (
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
          indiceActual={indiceCriterio}
          totalDesempenos={totalDesempenos}
          totalEvaluados={totalEvaluados}
          onAnterior={onAnterior}
          onSiguiente={onSiguiente}
        />
      )}
    </div>
  );
};
