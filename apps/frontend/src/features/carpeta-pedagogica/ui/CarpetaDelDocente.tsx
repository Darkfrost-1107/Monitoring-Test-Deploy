import { AlertTriangle, ExternalLink, FolderOpen, Loader2 } from 'lucide-react';
import { useCarpetaPedagogicaDeDocente } from '../api/use-carpeta-pedagogica-api';

/**
 * Carpeta pedagógica del docente, vista por quien lo monitorea.
 *
 * ── Por qué la ausencia se declara y no se calla ──
 * Que el docente no haya registrado su portafolio es información del monitoreo,
 * no una falla de la aplicación. Una pantalla en blanco deja al especialista sin
 * saber si el docente no cargó nada o si el sistema no cargó nada, y esa duda se
 * resuelve preguntando por WhatsApp en medio de una visita.
 *
 * Por la misma razón una falla de consulta se muestra distinta de una ausencia:
 * confundirlas llevaría a anotar «no tiene portafolio» cuando la petición nunca
 * llegó.
 */

interface Props {
  docenteId: string;
  /**
   * Año escolar de la VISITA, no el año en curso.
   *
   * Una visita de 2026 evalúa el portafolio de 2026, aunque la ficha se reabra
   * dos años después para consultarla.
   */
  anio: number;
}

export function CarpetaDelDocente({ docenteId, anio }: Props) {
  const { data, isLoading, isError } = useCarpetaPedagogicaDeDocente(docenteId, anio);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Consultando la carpeta pedagógica…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed bg-gray-50 p-6 flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No se pudo consultar la carpeta pedagógica. Volvé a intentarlo; esto no significa que
          el docente no la haya registrado.
        </p>
      </div>
    );
  }

  const carpeta = data?.carpeta ?? null;

  if (!carpeta) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-sm text-amber-900">
          El docente no registró su carpeta pedagógica para {anio}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          <FolderOpen className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">Carpeta pedagógica {carpeta.anioEscolar}</h3>
      </div>

      {carpeta.descripcion && <p className="text-sm text-slate-700">{carpeta.descripcion}</p>}

      <p className="text-xs text-muted-foreground">
        Actualizada el {new Date(carpeta.actualizadoEn).toLocaleDateString('es-PE')}
        {carpeta.actualizadoPor ? ` por ${carpeta.actualizadoPor}` : ''}
      </p>

      <a
        href={carpeta.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <ExternalLink className="h-4 w-4" />
        Abrir carpeta en Drive
      </a>

      <p className="text-xs text-muted-foreground">
        Si Drive pide permiso, la carpeta no está compartida como «cualquier persona con el
        enlace». Es responsabilidad del docente corregirlo.
      </p>
    </div>
  );
}
