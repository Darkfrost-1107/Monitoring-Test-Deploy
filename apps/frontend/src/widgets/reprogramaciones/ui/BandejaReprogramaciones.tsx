import { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import type { Cronograma } from '@entities/model-cronogramas';
import { puedeDecidirReprogramacion } from '@entities/model-reprogramaciones';
import { useUser } from '@entities/model-user';
import { RoleCode, MONITOR_CAMPO_ROLES } from '@sistema-monitoreo/shared-contracts';
import {
  SolicitarReprogramacionForm,
  DecidirReprogramacionForm,
} from '@features/reprogramaciones';
import {
  armarBandeja,
  solicitudesVisibles,
  visitasReprogramables,
  TODOS_LOS_ESTADOS,
  type FiltroDeEstado,
} from '@features/reprogramaciones/lib/bandeja';
import { CabeceraDeBandeja, FiltrosDeBandeja, SinSolicitudes } from './CabeceraDeBandeja';
import { TarjetaDeSolicitud } from './TarjetaDeSolicitud';

/**
 * Bandeja de solicitudes de reprogramación.
 *
 * Eran 347 líneas: el armado de la bandeja, el filtro de visibilidad —que
 * reimplementaba en paralelo el enrutamiento de `puedeDecidirReprogramacion`—,
 * la tarjeta de cada solicitud con su paleta escrita tres veces, y los dos
 * modales.
 */

const DESCRIPCIONES: Record<string, string> = {
  solicitante:
    'Revise el estado de sus solicitudes enviadas o registre una nueva reprogramación para sus visitas a futuro.',
  [RoleCode.DIRECTOR_INSTITUCION]:
    'Audite y apruebe o rechace los cambios de fecha propuestos por los coordinadores pedagógicos y jefes de taller.',
  ugel: 'Audite y apruebe o rechace los cambios de fecha propuestos por los especialistas de monitoreo.',
};

export const BandejaReprogramaciones = () => {
  const { user } = useUser();
  const {
    cronogramas,
    reprogramaciones,
    submitRescheduleRequest,
    approveRescheduleRequest,
    rejectRescheduleRequest,
  } = useCronogramasData();

  // Quien levanta la ficha en el aula solicita reprogramaciones; no las decide.
  const solicita = !!user && (MONITOR_CAMPO_ROLES as readonly string[]).includes(user.role);

  const [filtroDeEstado, setFiltroDeEstado] = useState<FiltroDeEstado>(TODOS_LOS_ESTADOS);
  const [visitaAbierta, setVisitaAbierta] = useState<string | null>(null);
  const [modal, setModal] = useState<'solicitar' | 'decidir' | null>(null);
  const [avisoSinVisitas, setAvisoSinVisitas] = useState(false);

  const bandeja = useMemo(
    () => armarBandeja(cronogramas, reprogramaciones),
    [cronogramas, reprogramaciones],
  );

  const visibles = useMemo(
    () => solicitudesVisibles(bandeja, user, filtroDeEstado),
    [bandeja, user, filtroDeEstado],
  );

  const reprogramables = useMemo(
    () => visitasReprogramables(cronogramas, user),
    [cronogramas, user],
  );

  const visita = cronogramas.find((c) => c.id === visitaAbierta) ?? null;
  const solicitudAbierta = visitaAbierta ? (reprogramaciones[visitaAbierta] ?? null) : null;

  const nuevaSolicitud = () => {
    if (reprogramables.length === 0) {
      setAvisoSinVisitas(true);
      return;
    }
    setAvisoSinVisitas(false);
    setVisitaAbierta(reprogramables[0].id);
    setModal('solicitar');
  };

  const abrirSolicitud = (visitId: string) => {
    setVisitaAbierta(visitId);
    setModal('decidir');
  };

  const cerrar = () => setModal(null);

  const descripcion = solicita
    ? DESCRIPCIONES.solicitante
    : (DESCRIPCIONES[user?.role ?? ''] ?? DESCRIPCIONES.ugel);

  return (
    <Card className="p-6 border border-border bg-surface shadow-sm space-y-6 animate-in fade-in duration-300">
      <CabeceraDeBandeja
        descripcion={descripcion}
        onNuevaSolicitud={solicita ? nuevaSolicitud : undefined}
      />

      {/* Antes era un `alert()` del navegador: bloqueaba la pestaña entera y se
          perdía en cuanto se aceptaba. */}
      {avisoSinVisitas && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-xl p-3.5 text-warning text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            No tiene visitas programadas a futuro disponibles para reprogramar. Una visita ya
            realizada o cancelada no admite cambio de fecha.
          </span>
        </div>
      )}

      <FiltrosDeBandeja estado={filtroDeEstado} onCambiar={setFiltroDeEstado} />

      {visibles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {visibles.map((solicitud) => (
            <TarjetaDeSolicitud
              key={solicitud.id}
              solicitud={solicitud}
              puedeDecidir={puedeDecidirReprogramacion(
                user,
                solicitud.visit,
                solicitud.solicitanteRolAlCrear,
              )}
              onAbrir={abrirSolicitud}
            />
          ))}
        </div>
      ) : (
        <SinSolicitudes />
      )}

      {visita && (
        <SolicitarReprogramacionForm
          isOpen={modal === 'solicitar'}
          onClose={cerrar}
          visit={visita}
          availableVisits={reprogramables as Cronograma[]}
          onSubmit={(data) => {
            submitRescheduleRequest(data.visitId, {
              fechaOriginal: data.fechaOriginal,
              fechaNueva: data.fechaNueva,
              motivo: data.motivo,
            });
            cerrar();
          }}
        />
      )}

      {visita && solicitudAbierta && (
        <DecidirReprogramacionForm
          isOpen={modal === 'decidir'}
          onClose={cerrar}
          visit={visita}
          request={solicitudAbierta}
          canDecide={puedeDecidirReprogramacion(
            user,
            visita,
            solicitudAbierta.solicitanteRolAlCrear,
          )}
          onApprove={(visitId, comentario) => {
            approveRescheduleRequest(visitId, comentario);
            cerrar();
          }}
          onReject={(visitId, comentario) => {
            rejectRescheduleRequest(visitId, comentario);
            cerrar();
          }}
        />
      )}
    </Card>
  );
};
