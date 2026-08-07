import { useState } from 'react';
import type { Plantilla } from '@entities/model-plantillas';
import {
  useCambiarEstadoPlantilla,
  useEliminarPlantilla,
  useDuplicarPlantilla,
  useCountFichasPlantilla,
} from '@entities/model-plantillas/use-plantillas-api';
import { siguienteEstado, type EstadoDePlantilla } from '../lib/estado-plantilla';

/**
 * Las acciones del catálogo de plantillas: clonar, cambiar de estado, eliminar.
 *
 * Fase 7 de PLAN_REMEDIACION.md. `PlantillasCatalog` declaraba nueve `useState`
 * y tres mutaciones antes de dibujar nada, con los mensajes de error y de éxito
 * repartidos entre cinco variables distintas. Acá quedan las tres operaciones
 * con su estado, y el widget se queda con lo que dibuja.
 */

export interface AccionesDePlantillas {
  clonar: ReturnType<typeof useDuplicarPlantilla>;
  cambiarEstado: ReturnType<typeof useCambiarEstadoPlantilla>;
  eliminar: ReturnType<typeof useEliminarPlantilla>;
}

export function useAccionesPlantilla(plantillas: readonly Plantilla[]) {
  const cambiarEstado = useCambiarEstadoPlantilla();
  const eliminar = useEliminarPlantilla();
  const clonar = useDuplicarPlantilla();

  /** Resultado de la última acción, mostrado sobre el listado. */
  const [aviso, setAviso] = useState<{ mensaje: string; tono: 'error' | 'exito' } | null>(null);
  const limpiarAviso = () => setAviso(null);

  // ── Clonar ──
  const [aClonar, setAClonar] = useState<Plantilla | null>(null);
  const [anioDestino, setAnioDestino] = useState(new Date().getFullYear());
  const [errorClonar, setErrorClonar] = useState<string | null>(null);

  const abrirClonar = (plantilla: Plantilla) => {
    setAClonar(plantilla);
    setAnioDestino(new Date().getFullYear());
    setErrorClonar(null);
  };

  const confirmarClonar = async () => {
    if (!aClonar) return;
    setErrorClonar(null);
    try {
      await clonar.mutateAsync({ id: aClonar.id, anioAcademico: anioDestino });
      setAClonar(null);
      setAviso({ mensaje: `Plantilla duplicada para el año ${anioDestino}`, tono: 'exito' });
    } catch (err) {
      setErrorClonar(err instanceof Error ? err.message : 'Error al duplicar la plantilla.');
    }
  };

  // ── Cambiar de estado ──
  const [aCambiarEstado, setACambiarEstado] = useState<Plantilla | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const abrirCambioDeEstado = (plantilla: Plantilla) => {
    setACambiarEstado(plantilla);
    setErrorEstado(null);
  };

  const confirmarCambioDeEstado = async () => {
    if (!aCambiarEstado) return;

    const destino = siguienteEstado(aCambiarEstado.estado as EstadoDePlantilla);
    setErrorEstado(null);
    setAviso(null);
    try {
      await cambiarEstado.mutateAsync({ id: aCambiarEstado.id, estado: destino });
      setACambiarEstado(null);
      setAviso({ mensaje: `Estado cambiado a ${destino}`, tono: 'exito' });
    } catch (err) {
      setErrorEstado(err instanceof Error ? err.message : 'Error al cambiar el estado.');
    }
  };

  // ── Eliminar ──
  const [aEliminarId, setAEliminarId] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const { data: infoFichas, isLoading: cargandoInfoEliminar } =
    useCountFichasPlantilla(aEliminarId);

  const aEliminar = aEliminarId ? (plantillas.find((p) => p.id === aEliminarId) ?? null) : null;
  const fichasAsociadas = infoFichas?.count ?? null;

  /** Se pierden datos: la plantilla es histórica y tiene fichas colgando. */
  const eliminacionDestructiva = aEliminar?.estado === 'Historico' && (fichasAsociadas ?? 0) > 0;

  const abrirEliminar = (plantilla: Plantilla) => {
    setAEliminarId(plantilla.id);
    setErrorEliminar(null);
  };

  const cerrarEliminar = () => {
    setAEliminarId(null);
    setErrorEliminar(null);
  };

  const confirmarEliminar = async () => {
    if (!aEliminarId) return;
    setErrorEliminar(null);
    try {
      const resultado = await eliminar.mutateAsync(aEliminarId);
      setAEliminarId(null);
      setAviso({
        mensaje: `Plantilla eliminada. Fichas removidas: ${resultado.deletedFichas}. Evidencias removidas: ${resultado.deletedEvidencias}.`,
        tono: 'exito',
      });
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : 'Error al eliminar la plantilla.');
    }
  };

  return {
    aviso,
    limpiarAviso,

    clonar: {
      objetivo: aClonar,
      anio: anioDestino,
      error: errorClonar,
      enCurso: clonar.isPending,
      setAnio: setAnioDestino,
      abrir: abrirClonar,
      cerrar: () => setAClonar(null),
      confirmar: confirmarClonar,
    },

    estado: {
      objetivo: aCambiarEstado,
      error: errorEstado,
      enCurso: cambiarEstado.isPending,
      abrir: abrirCambioDeEstado,
      cerrar: () => setACambiarEstado(null),
      confirmar: confirmarCambioDeEstado,
    },

    eliminar: {
      objetivo: aEliminar,
      abierto: !!aEliminarId,
      fichasAsociadas,
      cargandoInfo: cargandoInfoEliminar,
      esDestructivo: !!eliminacionDestructiva,
      error: errorEliminar,
      enCurso: eliminar.isPending,
      abrir: abrirEliminar,
      cerrar: cerrarEliminar,
      confirmar: confirmarEliminar,
    },
  };
}
