import { Button } from '@shared/ui/button';
import { numerosDePagina } from '@shared/lib/paginacion';

/**
 * Barra de paginación.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba escrita dentro de
 * `PlanMonitoreoAnualPage`, dibujando un botón por página sin límite: con
 * muchos registros la barra crecía sin fin. Ahora se eliden las intermedias.
 */

interface PaginacionProps {
  paginaActual: number;
  totalPaginas: number;
  /** Texto del pie: «Mostrando 1 a 6 de 14 registros». */
  rango: string;
  onCambiarPagina: (pagina: number) => void;
}

export const Paginacion = ({
  paginaActual,
  totalPaginas,
  rango,
  onCambiarPagina,
}: PaginacionProps) => (
  <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-2 shrink-0">
    <span className="text-xs text-text-muted font-medium">{rango}</span>
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onCambiarPagina(paginaActual - 1)}
        disabled={paginaActual === 1}
        aria-label="Página anterior"
        className="h-8 w-8 p-0 cursor-pointer rounded-lg border-border"
      >
        &lt;
      </Button>

      {numerosDePagina(paginaActual, totalPaginas).map((pagina, indice) =>
        pagina === 'elision' ? (
          <span
            key={`elision-${indice}`}
            aria-hidden
            className="px-1 text-xs text-text-muted select-none"
          >
            …
          </span>
        ) : (
          <Button
            key={pagina}
            variant={pagina === paginaActual ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCambiarPagina(pagina)}
            aria-current={pagina === paginaActual ? 'page' : undefined}
            className={`h-8 w-8 p-0 cursor-pointer rounded-lg ${
              pagina === paginaActual
                ? 'bg-primary text-white border-primary'
                : 'border-border text-text-muted hover:text-text'
            }`}
          >
            {pagina}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onCambiarPagina(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
        aria-label="Página siguiente"
        className="h-8 w-8 p-0 cursor-pointer rounded-lg border-border"
      >
        &gt;
      </Button>
    </div>
  </div>
);
