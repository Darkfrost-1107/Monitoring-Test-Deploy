import { Badge } from '@shared/ui/badge';

/**
 * Las insignias de tipo de entidad y estado de un plan.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban escritas dos veces en
 * `PlanMonitoreoAnualPage`, con las mismas clases salvo el tamaño.
 */

interface EtiquetaProps {
  /** La vista de lista usa una versión más chica. */
  compacta?: boolean;
}

const tamano = (compacta: boolean) =>
  compacta ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5';

export const EtiquetaEntidad = ({
  tipoEntidad,
  compacta = false,
}: EtiquetaProps & { tipoEntidad: string }) => (
  <Badge
    variant={tipoEntidad === 'UGEL' ? 'default' : 'secondary'}
    className={`font-bold rounded ${tamano(compacta)} ${
      tipoEntidad === 'UGEL'
        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/25'
        : 'bg-muted/70 text-text-muted border border-border'
    }`}
  >
    {tipoEntidad}
  </Badge>
);

export const EtiquetaEstado = ({
  estado,
  compacta = false,
}: EtiquetaProps & { estado: string }) => (
  <Badge
    className={`font-bold rounded ${tamano(compacta)} ${
      estado === 'Activo'
        ? 'bg-green-500/10 text-green-600 border border-green-500/25'
        : 'bg-destructive/10 text-destructive border border-destructive/25'
    }`}
  >
    {estado}
  </Badge>
);
