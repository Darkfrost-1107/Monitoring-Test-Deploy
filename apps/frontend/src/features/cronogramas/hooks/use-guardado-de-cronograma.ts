import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Cronograma } from '@entities/model-cronogramas';
import { useAtenderSolicitud } from '@features/visit-requests';
import { validarProgramacion, type FormularioCronograma } from '../lib/formulario';
import { aPayloadDeCreacion, aPayloadDeEdicion, resolverReferencias } from '../lib/payload';

/**
 * El guardado de una visita: validar, crear o actualizar, enlazar la solicitud
 * de la que vino y llevar al calendario.
 *
 * Eran cincuenta y ocho líneas dentro de `useProgramacionCronograma`, con seis
 * asuntos distintos en un solo `try`.
 */

const CALENDARIO = '/monitoreo/calendario';

interface Opciones {
  form: FormularioCronograma;
  editandoId: string | null;
  catalogos: {
    cronogramas: readonly Cronograma[];
    especialistas: readonly { id: string }[];
    instituciones: readonly { id: string }[];
    docentes: readonly { id: string }[];
  };
  crear: (payload: never) => Promise<{ id?: string } | undefined | void>;
  actualizar: (id: string, payload: never) => Promise<unknown>;
  /** Solicitud de visita que este cronograma viene a atender, si la hay. */
  solicitudPendiente: string | null;
  onGuardado: () => void;
}

export function useGuardadoDeCronograma({
  form,
  editandoId,
  catalogos,
  crear,
  actualizar,
  solicitudPendiente,
  onGuardado,
}: Opciones) {
  const navigate = useNavigate();
  const atenderSolicitud = useAtenderSolicitud();

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * Enlaza la solicitud con el cronograma recién creado.
   *
   * Si falla, el cronograma ya existe y la solicitud queda pendiente: se avisa
   * con lo que hay que hacer a mano, porque el aviso es lo único que queda.
   */
  const enlazarSolicitud = async (cronogramaId?: string) => {
    if (!solicitudPendiente) return;

    try {
      await atenderSolicitud.mutateAsync({
        id: solicitudPendiente,
        body: { cronogramaId },
      });
      toast.success('Solicitud de visita atendida con este cronograma.');
    } catch {
      toast.warning(
        'El cronograma se creó, pero la solicitud sigue pendiente. Márquela como atendida desde la bandeja de solicitudes.',
        { duration: 10_000 },
      );
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const falta = validarProgramacion(form, { esEdicion: !!editandoId });
    if (falta) {
      setError(falta);
      return;
    }

    const referencias = resolverReferencias(form, catalogos);
    if (!referencias) {
      // El formulario guarda identificadores; que uno no esté en el catálogo
      // significa que la persona o la institución dejó de estar disponible
      // mientras el formulario estaba abierto.
      setError(
        'El especialista, la institución o el evaluado ya no están disponibles. Vuelva a elegirlos y reintente.',
      );
      return;
    }

    setEnviando(true);
    try {
      if (editandoId) {
        await actualizar(editandoId, aPayloadDeEdicion(form) as never);
        onGuardado();

        const editado = catalogos.cronogramas.find((c) => c.id === editandoId);
        if (editado) {
          navigate(CALENDARIO, { state: { newDate: editado.fechaHora.substring(0, 10) } });
        }
        return;
      }

      const payload = aPayloadDeCreacion(form, referencias);
      const creada = await crear(payload as never);
      onGuardado();

      await enlazarSolicitud(creada?.id);

      navigate(CALENDARIO, { state: { newDate: payload.fechaProgramada } });
    } catch (err) {
      console.error('[Cronograma] Error guardando:', err);
      const detalle = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al guardar: ${detalle}`);
    } finally {
      setEnviando(false);
    }
  };

  return { guardar, error, setError, enviando };
}
