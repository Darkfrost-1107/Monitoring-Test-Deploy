import { useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { ISolicitudPlantilla } from '@sistema-monitoreo/shared-contracts';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { EntityStats } from '@shared/ui/EntityStats';
import { useSolicitudesPlantilla } from '../api/use-solicitudes-plantilla-api';
import { InsigniaEstado, PildorasDePlantillas } from './EstadoSolicitud';
import { DetalleSolicitudDialog } from './DetalleSolicitudDialog';

/**
 * Bandeja del Jefe de Gestión: pedidos de las instituciones para usar
 * plantillas propias.
 *
 * ── Por qué la lista no decide ──
 * La tarjeta resume y abre el detalle; aprobar y rechazar viven ahí adentro,
 * junto a la justificación. Decidir desde la lista invita a resolver sin abrir
 * el PDF, y entonces el trámite es un sello.
 *
 * ── Por qué el fallo de red se muestra distinto del vacío ──
 * Sin separarlos, una consulta caída se ve igual que una bandeja al día: la
 * pantalla diría «no hay solicitudes» y los pedidos esperando se darían por
 * inexistentes. Es la misma lección que ya está escrita en la bandeja de
 * solicitudes de visita.
 */

const FILTROS = [
  { valor: 'PENDIENTE' as string | undefined, etiqueta: 'Pendientes' },
  { valor: 'APROBADA' as string | undefined, etiqueta: 'Aprobadas' },
  { valor: 'RECHAZADA' as string | undefined, etiqueta: 'Rechazadas' },
  { valor: undefined, etiqueta: 'Todas' },
];

function Tarjeta({ solicitud, onAbrir }: { solicitud: ISolicitudPlantilla; onAbrir: () => void }) {
  const cuposLibres = solicitud.items.filter((i) => i.plantillaId === null).length;

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="w-full text-left bg-white rounded-xl border border-border shadow-xs p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-800 tracking-tight truncate">
              {solicitud.institucionNombre}
            </h3>
            <InsigniaEstado estado={solicitud.estado} />
          </div>
          <p className="text-xs text-muted-foreground">
            {solicitud.solicitante} · Año {solicitud.anioEscolar}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">
            Presentada
          </span>
          <span className="text-xs font-semibold text-slate-600">
            {new Date(solicitud.createdAt).toLocaleDateString('es-PE')}
          </span>
        </div>
      </div>

      <PildorasDePlantillas solicitud={solicitud} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className="text-[11px] text-muted-foreground">
          {solicitud.estado === 'APROBADA'
            ? `${cuposLibres} de ${solicitud.items.length} cupos sin usar`
            : `${solicitud.items.length} ${
                solicitud.items.length === 1 ? 'plantilla solicitada' : 'plantillas solicitadas'
              }`}
        </span>
        <span className="text-xs font-bold text-primary">Ver detalle y trazabilidad →</span>
      </div>
    </button>
  );
}

export function BandejaSolicitudesPlantillaPage() {
  const [filtro, setFiltro] = useState<string | undefined>('PENDIENTE');
  const [abiertaId, setAbiertaId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useSolicitudesPlantilla(filtro);
  // Segunda consulta sin filtro para los totales: el resumen debe contar la
  // bandeja entera, no lo que quedó a la vista.
  const { data: todas } = useSolicitudesPlantilla(undefined);

  const solicitudes = data?.solicitudes ?? [];
  // Se busca en la lista viva y no se guarda una copia: así el detalle refleja
  // el estado nuevo apenas la consulta se revalida tras aprobar o rechazar.
  const abierta = solicitudes.find((s) => s.id === abiertaId) ?? null;

  const cuenta = (estado: string) =>
    (todas?.solicitudes ?? []).filter((s) => s.estado === estado).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <ClipboardList className="w-6 h-6 text-primary" />
            Solicitudes de Plantilla
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedidos de las instituciones para usar plantillas propias además de las tres fichas
            oficiales.
          </p>
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={etiqueta}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${
                filtro === valor
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-slate-200'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      <EntityStats
        columns={3}
        cards={[
          {
            title: 'Pendientes',
            icon: <Clock className="h-5 w-5" />,
            value: cuenta('PENDIENTE'),
            trendText: 'Esperan tu decisión',
            trendType: cuenta('PENDIENTE') > 0 ? 'warning' : 'neutral',
          },
          {
            title: 'Aprobadas',
            icon: <CheckCircle2 className="h-5 w-5" />,
            value: cuenta('APROBADA'),
            trendText: 'Con cupos habilitados',
            trendType: 'success',
          },
          {
            title: 'Rechazadas',
            icon: <XCircle className="h-5 w-5" />,
            value: cuenta('RECHAZADA'),
            trendText: 'Con motivo registrado',
            trendType: 'neutral',
          },
        ]}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : isError ? (
        <Card
          role="alert"
          className="p-8 text-center border-destructive/20 bg-destructive/5 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-destructive">
            No se pudieron cargar las solicitudes. Puede haber pedidos esperando que no se están
            mostrando.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reintentar
          </Button>
        </Card>
      ) : solicitudes.length === 0 ? (
        <Card className="p-10 text-center border-border flex flex-col items-center gap-2">
          <Inbox className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">
            {filtro === 'PENDIENTE'
              ? 'No hay solicitudes esperando decisión.'
              : 'No hay solicitudes en este estado.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {solicitudes.map((s) => (
            <Tarjeta key={s.id} solicitud={s} onAbrir={() => setAbiertaId(s.id)} />
          ))}
        </div>
      )}

      <DetalleSolicitudDialog
        solicitud={abierta}
        puedeDecidir
        onClose={() => setAbiertaId(null)}
      />
    </div>
  );
}
