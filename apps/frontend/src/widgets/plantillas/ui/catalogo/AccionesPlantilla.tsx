import { Copy, Edit, AlertCircle, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Plantilla } from '@entities/model-plantillas';

/**
 * Los botones de acción de una tarjeta del catálogo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban dentro del `map` que dibuja las
 * tarjetas, en un ternario de sesenta líneas con dos ramas anidadas.
 *
 * Qué botón se ofrece lo deciden `permisos-plantilla.ts` y su prueba; acá sólo
 * se dibujan.
 */

interface BotonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  icono: ReactNode;
  children: ReactNode;
  /** Contorno punteado: la acción crea una copia en lugar de tocar el original. */
  destacado?: boolean;
  peligroso?: boolean;
}

const BotonDeAccion = ({
  onClick,
  disabled,
  title,
  icono,
  children,
  destacado,
  peligroso,
}: BotonProps) => {
  const estilo = destacado
    ? 'border-dashed border-primary text-primary hover:bg-primary-light'
    : peligroso
      ? 'border-rose-100 text-rose-600 hover:bg-rose-50'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full justify-center border text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${estilo}`}
    >
      {icono}
      <span>{children}</span>
    </button>
  );
};

interface AccionesPlantillaProps {
  plantilla: Plantilla;
  /** Copiar una plantilla de la UGEL para la propia institución. */
  puedeCopiarParaSuIE: boolean;
  /** Editar, clonar, cambiar de estado y eliminar. */
  puedeGestionar: boolean;
  /** Clonar la plantilla del director sin poder modificarla. */
  puedeClonarLaDelDirector: boolean;
  clonando: boolean;
  cambiandoEstado: boolean;
  onEditar: () => void;
  onClonar: () => void;
  onCambiarEstado: () => void;
  onEliminar: () => void;
}

export const AccionesPlantilla = ({
  plantilla,
  puedeCopiarParaSuIE,
  puedeGestionar,
  puedeClonarLaDelDirector,
  clonando,
  cambiandoEstado,
  onEditar,
  onClonar,
  onCambiarEstado,
  onEliminar,
}: AccionesPlantillaProps) => {
  if (puedeCopiarParaSuIE) {
    return (
      <BotonDeAccion
        onClick={onClonar}
        disabled={clonando}
        title="Copiar y personalizar para mi I.E."
        icono={<Copy className="h-3.5 w-3.5" />}
        destacado
      >
        Copiar para mi I.E.
      </BotonDeAccion>
    );
  }

  if (puedeGestionar) {
    return (
      <div className="flex flex-col gap-2">
        <BotonDeAccion
          onClick={onEditar}
          title="Modificar contenido"
          icono={<Edit className="h-3.5 w-3.5 text-primary" />}
        >
          Modificar Plantilla
        </BotonDeAccion>

        <BotonDeAccion
          onClick={onClonar}
          disabled={clonando}
          title="Duplicar plantilla"
          icono={<Copy className="h-3.5 w-3.5 text-primary" />}
        >
          Clonar Plantilla
        </BotonDeAccion>

        {/* De histórica no se vuelve, así que no se ofrece el cambio. */}
        {plantilla.estado !== 'Historico' && (
          <BotonDeAccion
            onClick={onCambiarEstado}
            disabled={cambiandoEstado}
            title="Cambiar Estado"
            icono={<AlertCircle className="h-3.5 w-3.5 text-primary" />}
          >
            Cambiar Estado
          </BotonDeAccion>
        )}

        <BotonDeAccion
          onClick={onEliminar}
          title="Eliminar Plantilla"
          icono={<Trash2 className="h-3.5 w-3.5" />}
          peligroso
        >
          Eliminar Plantilla
        </BotonDeAccion>
      </div>
    );
  }

  if (puedeClonarLaDelDirector) {
    return (
      <BotonDeAccion
        onClick={onClonar}
        disabled={clonando}
        title="Clonar plantilla del director"
        icono={<Copy className="h-3.5 w-3.5" />}
        destacado
      >
        Clonar Plantilla del Director
      </BotonDeAccion>
    );
  }

  return null;
};
