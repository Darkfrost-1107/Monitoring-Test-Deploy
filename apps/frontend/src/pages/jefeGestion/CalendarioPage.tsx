import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { aFechaISOLocal, aFechaLocal } from '@shared/lib/fecha/fecha';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { cronogramasVisibles } from '@features/cronogramas/lib/visibilidad';
import {
  armarBandeja,
  solicitudesVisibles,
} from '@features/reprogramaciones/lib/bandeja';
import { useFiltrosCalendario } from '@widgets/calendario/model/use-filtros-calendario';
import { opcionesDeFiltro } from '@widgets/calendario/model/opciones-de-filtro';
import { CalendarioGrid, CalendarioSidebar } from '@widgets/calendario';
import { BandejaReprogramaciones } from '@widgets/reprogramaciones';

/**
 * Calendario de monitoreo, con su bandeja de reprogramaciones al lado.
 *
 * Eran 306 líneas. Buena parte era filtrado que ya vivía extraído y probado en
 * otra parte —`cronogramasVisibles`— con una capa encima que lo repetía por
 * nombre del especialista.
 */

const VISTAS = ['MENSUAL', 'SEMANAL', 'DIARIO', 'ANUAL', 'LISTA'] as const;

type Vista = (typeof VISTAS)[number];

const NOMBRE_DE_VISTA: Record<Vista, string> = {
  MENSUAL: 'Mensual',
  SEMANAL: 'Semanal',
  DIARIO: 'Diario',
  ANUAL: 'Anual',
  LISTA: 'Lista',
};

export const CalendarioPage = () => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const { cronogramas, reprogramaciones } = useCronogramasData();

  // Enlace directo: `?tab=solicitudes` abre la bandeja, que es a donde apunta
  // la notificación de una solicitud de reprogramación.
  const [pestana, setPestana] = useState<'CALENDARIO' | 'SOLICITUDES'>(() =>
    new URLSearchParams(location.search).get('tab') === 'solicitudes'
      ? 'SOLICITUDES'
      : 'CALENDARIO',
  );
  const [fechaVisible, setFechaVisible] = useState<Date>(() => new Date());
  const [vista, setVista] = useState<Vista>('MENSUAL');

  const [diaElegido, setDiaElegido] = useState<string>(() => aFechaISOLocal(new Date()));
  const [visitaElegida, setVisitaElegida] = useState<string | null>(null);
  const [detalleVisible, setDetalleVisible] = useState(true);

  // Al volver de crear o editar un cronograma, el calendario se posa sobre la
  // fecha registrada.
  const fechaDeVuelta = (location.state as { newDate?: string } | null)?.newDate;
  const [saltoAplicado, setSaltoAplicado] = useState<string | null>(null);

  if (fechaDeVuelta && saltoAplicado !== fechaDeVuelta) {
    setSaltoAplicado(fechaDeVuelta);
    const fecha = aFechaLocal(fechaDeVuelta);
    if (fecha) {
      setFechaVisible(fecha);
      setDiaElegido(aFechaISOLocal(fecha));
    }
  }

  // Limpiar el `state` es navegar, y navegar es un efecto. Va aparte del salto
  // de fecha, que es un ajuste de estado y se resuelve durante el render.
  useEffect(() => {
    if (!fechaDeVuelta) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [fechaDeVuelta, location.pathname, navigate]);

  const esDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  // Los seis filtros del calendario, con sus reglas cubiertas en
  // `widgets/calendario/model/filtros.ts`.
  const filtros = useFiltrosCalendario(esDirector ? 'director' : 'ugel');
  const { valores: filtro } = filtros;

  // La bandeja de un director sólo tiene sentido en Secundaria: es donde
  // existen los cargos que solicitan reprogramaciones.
  const mostrarBandeja = !esDirector || user?.institucionNivel === 'Secundaria';

  // Regla única de visibilidad, compartida con CronogramaPage. Incluye la de
  // los monitores de campo, que antes esta página repetía por su cuenta
  // comparando `visit.especialista` con «nombres apellidos» del usuario.
  const delUsuario = useMemo(() => cronogramasVisibles(cronogramas, user), [cronogramas, user]);

  const opciones = useMemo(
    () => opcionesDeFiltro(delUsuario, filtro.modalidad),
    [delUsuario, filtro.modalidad],
  );

  // El contador cuenta lo que la bandeja va a mostrar. Antes sumaba todas las
  // solicitudes pendientes del sistema, así que la insignia podía anunciar
  // pendientes que al abrir la bandeja no estaban.
  const pendientes = useMemo(() => {
    const bandeja = armarBandeja(cronogramas, reprogramaciones);
    return solicitudesVisibles(bandeja, user, 'PENDIENTE').length;
  }, [cronogramas, reprogramaciones, user]);

  const visitas = useMemo(
    () =>
      delUsuario.filter((visita) => {
        if (esDirector) {
          if (filtro.nroVisita !== 'Todos' && visita.nroVisita !== filtro.nroVisita) return false;
          if (filtro.estado !== 'Todos' && visita.estado !== filtro.estado) return false;
        } else {
          if (filtro.modalidad !== 'Todos' && visita.modalidad !== filtro.modalidad) return false;
          if (filtro.nivel !== 'Todos' && visita.nivel !== filtro.nivel) return false;
        }

        if (filtro.especialista !== 'Todos' && visita.especialista !== filtro.especialista) {
          return false;
        }
        if (filtro.tipo !== 'Todos' && visita.tipo !== filtro.tipo) return false;

        return true;
      }),
    [delUsuario, esDirector, filtro],
  );

  const cambiarVista = (nueva: Vista) => {
    setVista(nueva);
    if (nueva !== 'DIARIO') return;

    // La vista diaria necesita un día concreto: se posa sobre el que el
    // calendario está mostrando y abre su primera visita, si la hay.
    const dia = aFechaISOLocal(fechaVisible);
    setDiaElegido(dia);

    const delDia = visitas.filter((v) => v.fechaHora.substring(0, 10) === dia);
    if (delDia.length > 0) setVisitaElegida(delDia[0].id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Calendario de Monitoreo"
          description="Planificación y seguimiento de visitas institucionales."
        />

        {pestana === 'CALENDARIO' && (
          <div className="inline-flex rounded-xl border border-border p-1 bg-surface shadow-sm">
            {VISTAS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => cambiarVista(v)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  vista === v
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-muted hover:text-text hover:bg-slate-50'
                }`}
              >
                {NOMBRE_DE_VISTA[v]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-border flex gap-6 pb-px">
        <Pestana
          activa={pestana === 'CALENDARIO'}
          onClick={() => setPestana('CALENDARIO')}
          icono={<Calendar className="h-4 w-4" />}
          titulo="Calendario de Monitoreos"
        />
        {mostrarBandeja && (
          <Pestana
            activa={pestana === 'SOLICITUDES'}
            onClick={() => setPestana('SOLICITUDES')}
            icono={<RefreshCw className="h-4 w-4" />}
            titulo="Bandeja de Reprogramaciones"
            insignia={pendientes}
          />
        )}
      </div>

      {pestana === 'CALENDARIO' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={detalleVisible ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <CalendarioGrid
              visitas={visitas}
              navegacion={{
                fecha: fechaVisible,
                onFecha: setFechaVisible,
                vista,
                onVista: setVista,
              }}
              seleccion={{
                fecha: diaElegido,
                onFecha: setDiaElegido,
                visitaId: visitaElegida,
                onVisitaId: setVisitaElegida,
                onAbrirDetalle: () => setDetalleVisible(true),
              }}
              filtros={filtros}
              opcionesDeFiltro={opciones}
              detalleVisible={detalleVisible}
            />
          </div>

          {detalleVisible && (
            <CalendarioSidebar
              selectedVisitId={visitaElegida}
              setSelectedVisitId={setVisitaElegida}
              selectedDateStr={diaElegido}
              onClose={() => setDetalleVisible(false)}
              filteredVisits={visitas}
            />
          )}
        </div>
      ) : (
        <BandejaReprogramaciones />
      )}
    </div>
  );
};

interface PestanaProps {
  activa: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  titulo: string;
  insignia?: number;
}

const Pestana = ({ activa, onClick, icono, titulo, insignia }: PestanaProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`pb-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 relative cursor-pointer ${
      activa
        ? 'border-primary text-primary font-extrabold'
        : 'border-transparent text-text-muted hover:text-text'
    }`}
  >
    {icono}
    <span>{titulo}</span>
    {!!insignia && insignia > 0 && (
      <span className="absolute -top-1.5 -right-3.5 bg-amber-500 text-white font-extrabold text-[9px] h-4.5 min-w-4.5 px-1.5 rounded-full flex items-center justify-center border border-surface shadow-sm animate-pulse">
        {insignia}
      </span>
    )}
  </button>
);
