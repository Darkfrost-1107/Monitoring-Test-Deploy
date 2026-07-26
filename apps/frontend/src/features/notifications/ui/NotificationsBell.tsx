import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Button } from '@shared/ui/button';
import { useNotificaciones, useMarcarLeida, useMarcarTodasLeidas } from '../api/use-notifications-api';

const tiempoRelativo = (iso: string): string => {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-PE');
};

const getNotificationBadge = (tipo: string) => {
  switch (tipo) {
    case 'SOLICITUD_REPROGRAMACION_CREADA':
      return {
        icon: Calendar,
        bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        actionUrl: '/monitoreo/calendario?tab=solicitudes',
        actionLabel: 'Ver Reprogramaciones',
      };
    case 'REPROGRAMACION_APROBADA':
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        actionUrl: '/monitoreo/calendario',
        actionLabel: 'Ver Calendario',
      };
    case 'REPROGRAMACION_RECHAZADA':
      return {
        icon: XCircle,
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        actionUrl: '/monitoreo/calendario',
        actionLabel: 'Ver Calendario',
      };
    case 'CRONOGRAMA_REPROGRAMADO':
      return {
        icon: Calendar,
        bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        actionUrl: '/monitoreo/calendario',
        actionLabel: 'Ver Calendario',
      };
    case 'SOLICITUD_VISITA':
    case 'SOLICITUD_RESUELTA':
      return {
        icon: FileText,
        bg: 'bg-primary/10 text-primary',
        actionUrl: '/monitoreo/solicitudes-visita',
        actionLabel: 'Ver Solicitudes de visita',
      };
    case 'ALERTA_INSTITUCION':
    case 'ALERTA_DISTRITO':
    case 'IE_SIN_VISITA':
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        actionUrl: '/monitoreo/solicitudes-visita',
        actionLabel: 'Ver Solicitudes de visita',
      };
    default:
      return {
        icon: FileText,
        bg: 'bg-primary/10 text-primary',
        actionUrl: null,
        actionLabel: null,
      };
  }
};

export const NotificationsBell = () => {
  const navigate = useNavigate();
  const { data } = useNotificaciones();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const [expandida, setExpandida] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'sin_leer'>('todas');

  const toggle = (id: string, leida: boolean) => {
    setExpandida((prev) => (prev === id ? null : id));
    if (!leida) marcarLeida.mutate(id);
  };

  const items = data?.items ?? [];
  const noLeidas = data?.noLeidas ?? 0;

  const itemsFiltrados = items.filter((n) => (filtro === 'sin_leer' ? !n.leida : true));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-text-muted hover:text-text hover:bg-muted cursor-pointer rounded-lg transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-surface animate-pulse">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-xl border-border/80">
        {/* Cabecera del Panel */}
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {noLeidas} nuevas
                </span>
              )}
            </div>
            {noLeidas > 0 && (
              <button
                onClick={() => marcarTodas.mutate()}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
              </button>
            )}
          </div>

          {/* Filtros de Pestaña */}
          <div className="flex gap-1 border-b border-transparent">
            <button
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                filtro === 'todas'
                  ? 'bg-surface text-foreground shadow-sm border border-border/60'
                  : 'text-text-muted hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Todas ({items.length})
            </button>
            <button
              onClick={() => setFiltro('sin_leer')}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                filtro === 'sin_leer'
                  ? 'bg-surface text-foreground shadow-sm border border-border/60'
                  : 'text-text-muted hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Sin leer ({noLeidas})
            </button>
          </div>
        </div>

        {/* Lista Notificaciones */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {itemsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Inbox className="w-9 h-9 text-text-dim mb-2 opacity-50" />
              <p className="text-sm font-medium text-text-muted">
                {filtro === 'sin_leer' ? 'No tienes notificaciones sin leer.' : 'Sin notificaciones recibidas.'}
              </p>
            </div>
          ) : (
            itemsFiltrados.map((n) => {
              const abierta = expandida === n.id;
              const badge = getNotificationBadge(n.tipo);
              const IconComp = badge.icon;

              return (
                <div
                  key={n.id}
                  onClick={() => toggle(n.id, n.leida)}
                  className={`flex gap-3 p-3.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                    n.leida ? 'opacity-75 bg-surface' : 'bg-primary/5 font-normal'
                  }`}
                >
                  {/* Icono temático */}
                  <div
                    className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${badge.bg}`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-xs font-bold leading-snug text-foreground ${
                          abierta ? '' : 'line-clamp-2'
                        }`}
                      >
                        {n.titulo}
                      </span>
                      <span className="text-[10px] text-text-muted shrink-0 whitespace-nowrap mt-0.5">
                        {tiempoRelativo(n.createdAt)}
                      </span>
                    </div>

                    <p
                      className={`text-xs text-text-muted mt-1 leading-relaxed whitespace-pre-line ${
                        abierta ? '' : 'line-clamp-2'
                      }`}
                    >
                      {n.mensaje}
                    </p>

                    {n.emisorNombre && abierta && (
                      <p className="text-[11px] text-text-muted mt-1.5 italic">
                        De: {n.emisorNombre}
                      </p>
                    )}

                    {/* Botón de Acción rápida si la notificación tiene ruta */}
                    {badge.actionUrl && (
                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!n.leida) marcarLeida.mutate(n.id);
                            navigate(badge.actionUrl!);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer group/link"
                        >
                          <span>{badge.actionLabel}</span>
                          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
