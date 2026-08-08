import { useMemo, useState } from 'react';
import type { Cronograma } from '@entities/model-cronogramas';
import type { Docente } from '@entities/model-docentes';
import {
  especialistasAsignables,
  institucionesAsignables,
  modalidadesPermitidas,
  nivelesPermitidos,
  type EspecialistaAsignable,
  type InstitucionAsignable,
  type UsuarioAsignador,
} from '../lib/asignacion';
import { fechaProgramadaPorDefecto } from '../lib/formulario';
import {
  opcionesDeEspecialista,
  opcionesDeInstitucion,
  type InstitucionOfrecible,
} from '../lib/opciones-de-asignacion';
import { numerosDeVisitaDisponibles } from '../lib/numeracion-visitas';
import { useFormularioCronograma } from './use-formulario-cronograma';
import { useOpcionesDeEvaluacion } from './use-opciones-de-evaluacion';
import { useSincronizacionFormulario } from './use-sincronizacion-formulario';
import { usePrefillDeSolicitud } from './use-prefill-de-solicitud';
import { useGuardadoDeCronograma } from './use-guardado-de-cronograma';

/**
 * Programación de una visita de monitoreo: alta, edición y precarga.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `CronogramaPage` mezclaba dos asuntos
 * distintos: **listar** cronogramas y **programar** uno. Este hook toma el
 * segundo y coordina las piezas: el estado del formulario, la cascada de
 * opciones, las correcciones automáticas, la precarga desde una solicitud y el
 * guardado. Cada una vive en su propio archivo, con su cobertura.
 */

interface UsuarioProgramador extends UsuarioAsignador {
  /** Identificador de su institución, cuando pertenece a una. */
  institucion?: string;
  /** Identificador de su registro de especialista, con el que se lo asigna. */
  especialistaId?: string;
}

interface ProgramacionParams {
  usuario: UsuarioProgramador | null | undefined;
  /** Personal de institución educativa: programa sobre su propio colegio. */
  esDeInstitucion: boolean;
  catalogos: {
    cronogramas: readonly Cronograma[];
    especialistas: readonly (EspecialistaAsignable & {
      id: string;
      personaId: string;
      nombre: string;
      cargo?: string;
    })[];
    instituciones: readonly (InstitucionAsignable & InstitucionOfrecible)[];
    docentes: readonly Docente[];
  };
  crear: (payload: never) => Promise<{ id?: string } | undefined | void>;
  actualizar: (id: string, payload: never) => Promise<unknown>;
}

export function useProgramacionCronograma({
  usuario,
  esDeInstitucion,
  catalogos,
  crear,
  actualizar,
}: ProgramacionParams) {
  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState<string | null>(null);

  const { valores: form, cambiar, reiniciar } = useFormularioCronograma();
  const { cronogramas, especialistas, instituciones, docentes } = catalogos;

  const { guardar, error, setError, enviando } = useGuardadoDeCronograma({
    form,
    editandoId,
    catalogos,
    crear,
    actualizar,
    solicitudPendiente,
    onGuardado: () => {
      setAbierto(false);
      setSolicitudPendiente(null);
    },
  });

  /** Evaluado elegido, resuelto a su registro. */
  const evaluadoResuelto = useMemo(
    () => (form.evaluadoId ? (docentes.find((d) => d.id === form.evaluadoId) ?? null) : null),
    [form.evaluadoId, docentes],
  );

  const { evaluados, esSecundaria, opcionesDeEvaluado, opcionesDeEvaluador } =
    useOpcionesDeEvaluacion({
      docentes,
      instituciones,
      especialistas,
      esDirector: esDeInstitucion,
      institucionDelUsuarioId: usuario?.institucion,
      institucionElegidaId: form.institucionId,
      tipoDeVisita: form.tipo,
      evaluadorElegidoId: form.monitorId,
      evaluadoElegidoId: form.evaluadoId,
    });

  useSincronizacionFormulario({
    esEdicion: editandoId !== null,
    evaluadorElegidoId: form.monitorId,
    evaluadoElegidoId: form.evaluadoId,
    tipoDeVisita: form.tipo,
    evaluadosDisponibles: evaluados,
    evaluadoResuelto,
    cronogramas,
    onCambiar: cambiar,
  });

  usePrefillDeSolicitud({
    catalogos: { instituciones, docentes },
    reiniciar,
    onAviso: setError,
    onAbrir: (solicitudId) => {
      setEditandoId(null);
      setSolicitudPendiente(solicitudId);
      setAbierto(true);
    },
  });

  // Cascada de asignación: modalidad → nivel → especialista e institución.
  const opciones = useMemo(
    () => ({
      modalidades: modalidadesPermitidas(usuario),
      niveles: nivelesPermitidos(form.modalidad, usuario),
      especialistas: opcionesDeEspecialista(
        especialistasAsignables(especialistas, form.modalidad, form.nivel, usuario),
      ),
      instituciones: opcionesDeInstitucion(
        institucionesAsignables(instituciones, form.modalidad, form.nivel),
      ),
      evaluados: opcionesDeEvaluado,
      evaluadores: opcionesDeEvaluador,
      visitas: numerosDeVisitaDisponibles(
        evaluadoResuelto
          ? cronogramas.filter((c) => c.evaluadoId === evaluadoResuelto.id && c.tipo === form.tipo)
          : [],
      ),
    }),
    [
      usuario,
      form.modalidad,
      form.nivel,
      form.tipo,
      especialistas,
      instituciones,
      opcionesDeEvaluado,
      opcionesDeEvaluador,
      evaluadoResuelto,
      cronogramas,
    ],
  );

  const abrirCreacion = () => {
    setEditandoId(null);
    setSolicitudPendiente(null);
    setError(null);

    // Quien pertenece a una institución programa siempre sobre la suya: se
    // precarga para que no tenga que elegir lo único que puede elegir. Se busca
    // por identificador, que el token ya trae; antes se buscaba por nombre y,
    // si no acertaba, se rellenaba con 'EBR' y 'Primaria' inventados.
    const suInstitucion = instituciones.find((i) => i.id === usuario?.institucion);

    reiniciar({
      fechaHora: fechaProgramadaPorDefecto(),
      ...(esDeInstitucion && suInstitucion
        ? {
            institucionId: suInstitucion.id,
            monitorId: usuario?.especialistaId ?? '',
            modalidad: suInstitucion.modalidad,
            nivel: suInstitucion.nivelEducativo,
          }
        : {}),
    });

    setAbierto(true);
  };

  const abrirEdicion = (visita: Cronograma) => {
    setEditandoId(visita.id);
    setSolicitudPendiente(null);
    setError(null);

    reiniciar({
      fechaHora: visita.fechaHora,
      modalidad: visita.modalidad,
      nivel: visita.nivel,
      tipo: visita.tipo,
      visita: visita.nroVisita,
      estado: visita.estado,
      observaciones: visita.observaciones || '',
      monitorId: visita.monitorId,
      institucionId: visita.institucionId,
      evaluadoId: visita.evaluadoId ?? '',
    });

    setAbierto(true);
  };

  return {
    form,
    cambiar,
    opciones,
    esSecundaria,
    abierto,
    esEdicion: editandoId !== null,
    envio: { error, enviando },
    abrirCreacion,
    abrirEdicion,
    cerrar: () => setAbierto(false),
    guardar,
  };
}
