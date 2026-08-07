import { Eye, RotateCcw, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/button';

/**
 * Los botones de acción sobre un plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban escritos dos veces, palabra por
 * palabra, en `PlanMonitoreoAnualPage`: una vez en la vista de cuadrícula y
 * otra en la de lista.
 */

interface AccionesPlanProps {
  activo: boolean;
  /** Si no puede gestionarlo, sólo se ofrece ver el documento. */
  puedeGestionar: boolean;
  ocupado: boolean;
  onVer: () => void;
  onCambiarEstado: () => void;
  onEliminar: () => void;
  /** La vista de lista usa un botón de ver un poco más ancho. */
  compacto?: boolean;
}

export const AccionesPlan = ({
  activo,
  puedeGestionar,
  ocupado,
  onVer,
  onCambiarEstado,
  onEliminar,
  compacto = false,
}: AccionesPlanProps) => (
  <>
    <Button
      variant="ghost"
      onClick={onVer}
      disabled={ocupado}
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold ${
        compacto ? 'px-3.5' : 'px-4'
      } py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg h-8 transition-colors select-none border-none`}
    >
      <Eye className="w-3.5 h-3.5" />
      Ver
    </Button>

    {puedeGestionar && (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCambiarEstado}
          className={`h-8 w-8 text-text-muted transition-colors rounded-lg cursor-pointer ${
            activo
              ? 'hover:text-destructive hover:bg-destructive/15'
              : 'hover:text-primary hover:bg-primary/15'
          }`}
          title={activo ? 'Desactivar Plan' : 'Reactivar Plan'}
        >
          {activo ? <PowerOff className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onEliminar}
          className="h-8 w-8 text-text-muted hover:text-destructive hover:bg-destructive/15 transition-colors rounded-lg cursor-pointer"
          title="Eliminar por completo"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </>
    )}
  </>
);
