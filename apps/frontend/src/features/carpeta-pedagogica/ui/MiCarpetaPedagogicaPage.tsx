import { useMemo, useState } from 'react';
import { ExternalLink, FolderOpen, Info, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  anioEscolarVigente,
  aniosEscolaresDisponibles,
  type ICarpetaPedagogica,
} from '@sistema-monitoreo/shared-contracts';
import { enlaceDrive } from '@sistema-monitoreo/shared-validation';
import { ErrorDeApi } from '@shared/config/api';
import { PageHeader } from '@shared/ui/pageHeader';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
  useEliminarMiCarpetaPedagogica,
  useGuardarMiCarpetaPedagogica,
  useMiCarpetaPedagogica,
} from '../api/use-carpeta-pedagogica-api';

/**
 * Mi carpeta pedagógica.
 *
 * El docente publica su portafolio en Google Drive y registra acá el enlace. El
 * sistema no almacena los archivos: guarda la referencia.
 *
 * ── Por qué la pantalla insiste con los permisos de Drive ──
 * La validación comprueba que el enlace sea de Drive, no que esté compartido.
 * Un enlace privado pasa todos los controles y falla recién cuando el monitor
 * intenta abrirlo, cuando ya nadie está mirando esta pantalla. Por eso la
 * instrucción es permanente y no un aviso que se descarta.
 */

/**
 * Años ofrecidos y año elegido por defecto.
 *
 * Los dos salen del contrato compartido: la lista arranca en la puesta en
 * marcha y termina en el año en curso, y el valor por defecto es ese mismo año
 * vigente, que es el que el docente viene a cargar.
 *
 * No hay años futuros. El portafolio documenta el ciclo que está ocurriendo.
 */
const useAniosEscolares = () =>
  useMemo(() => {
    const enCurso = new Date().getFullYear();
    return {
      anios: aniosEscolaresDisponibles(enCurso),
      porDefecto: anioEscolarVigente(enCurso),
    };
  }, []);

/**
 * Mensaje que se le muestra al docente cuando falla una operación.
 *
 * El servidor explica por qué rechazó la petición —el enlace no es de Drive,
 * el año no corresponde, la sesión no es de un docente— y `ErrorDeApi` ya trae
 * ese texto. Reemplazarlo por un «no se pudo» genérico deja a la persona sin
 * saber qué corregir, y a quien depura sin saber qué pasó.
 */
const motivoDelFallo = (error: unknown, respaldo: string): string =>
  error instanceof ErrorDeApi && error.message ? error.message : respaldo;

interface FormularioProps {
  anio: number;
  carpeta: ICarpetaPedagogica | null;
}

/**
 * Formulario del enlace.
 *
 * Vive aparte del resto de la pantalla porque su estado tiene que reiniciarse
 * cuando cambia el año o llega otro enlace del servidor. Se consigue montándolo
 * con `key`, y no sincronizando con un efecto: el efecto provoca un render en
 * cascada y deja una ventana en la que el formulario muestra el enlace de un
 * año mientras el selector ya marca otro.
 */
function FormularioEnlace({ anio, carpeta }: FormularioProps) {
  const [url, setUrl] = useState(carpeta?.url ?? '');
  const [descripcion, setDescripcion] = useState(carpeta?.descripcion ?? '');

  const guardar = useGuardarMiCarpetaPedagogica();
  const eliminar = useEliminarMiCarpetaPedagogica();

  const validacion = enlaceDrive().safeParse(url);
  const errorDeEnlace =
    url.trim() !== '' && !validacion.success ? validacion.error.issues[0]?.message : null;

  const onGuardar = async () => {
    if (!validacion.success) {
      toast.error('Revisá el enlace antes de guardar.');
      return;
    }
    try {
      await guardar.mutateAsync({
        anioEscolar: anio,
        url: validacion.data,
        descripcion: descripcion.trim() || undefined,
      });
      toast.success('Carpeta pedagógica registrada.');
    } catch (error) {
      toast.error(motivoDelFallo(error, 'No se pudo guardar el enlace.'));
    }
  };

  const onEliminar = async () => {
    try {
      await eliminar.mutateAsync(anio);
      toast.success('Enlace retirado.');
    } catch (error) {
      toast.error(motivoDelFallo(error, 'No se pudo retirar el enlace.'));
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="url-carpeta">Enlace de Google Drive</Label>
        <Input
          id="url-carpeta"
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/drive/folders/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={errorDeEnlace !== null}
          aria-describedby={errorDeEnlace ? 'error-url-carpeta' : undefined}
        />
        {errorDeEnlace && (
          <p id="error-url-carpeta" className="text-sm text-destructive">
            {errorDeEnlace}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="descripcion-carpeta">Descripción (opcional)</Label>
        <Input
          id="descripcion-carpeta"
          placeholder="Qué contiene la carpeta"
          maxLength={500}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onGuardar} disabled={guardar.isPending || !validacion.success}>
          {guardar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {carpeta ? 'Actualizar enlace' : 'Guardar enlace'}
        </Button>

        {carpeta && (
          <>
            <Button variant="outline" asChild>
              {/* `noopener noreferrer`: la página de destino la elige el usuario,
                  y no debe recibir control sobre esta pestaña ni el referente. */}
              <a href={carpeta.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir carpeta
              </a>
            </Button>
            <Button variant="ghost" onClick={onEliminar} disabled={eliminar.isPending}>
              <Trash2 className="h-4 w-4" />
              Retirar
            </Button>
          </>
        )}
      </div>

      {carpeta && (
        <p className="text-sm text-muted-foreground">
          Última actualización: {new Date(carpeta.actualizadoEn).toLocaleDateString('es-PE')}
          {carpeta.actualizadoPor ? ` · ${carpeta.actualizadoPor}` : ''}
        </p>
      )}
    </>
  );
}

export function MiCarpetaPedagogicaPage() {
  const { anios, porDefecto } = useAniosEscolares();
  const [anio, setAnio] = useState(porDefecto);

  const { data, isLoading } = useMiCarpetaPedagogica(anio);
  const carpeta = data?.carpeta ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi Carpeta Pedagógica"
        description="Registra el enlace a la carpeta de Google Drive donde tienes tu portafolio pedagógico."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">Enlace de la carpeta</h3>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="anio-escolar">Año escolar</Label>
            <select
              id="anio-escolar"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
            >
              {anios.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              {!carpeta && (
                <p className="text-sm text-muted-foreground">
                  Todavía no registraste una carpeta para {anio}.
                </p>
              )}
              {/* `key` reinicia el formulario cuando cambia el año o el enlace
                  que devolvió el servidor. Es lo que evita el efecto de sincronía. */}
              <FormularioEnlace key={`${anio}-${carpeta?.id ?? 'nueva'}`} anio={anio} carpeta={carpeta} />
            </>
          )}
        </div>

        <aside className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-900">
            <Info className="h-5 w-5" />
            <h4 className="font-semibold">Antes de guardar</h4>
          </div>
          <p className="text-sm text-amber-900">
            El sistema guarda el enlace, no los archivos. Si la carpeta no está compartida, tu
            monitor no podrá verla.
          </p>
          <ol className="text-sm text-amber-900 list-decimal pl-5 flex flex-col gap-1">
            <li>Abre la carpeta en Google Drive.</li>
            <li>
              Entra a <strong>Compartir</strong> y elige{' '}
              <strong>Cualquier persona con el enlace</strong>.
            </li>
            <li>
              Deja el permiso en <strong>Lector</strong>.
            </li>
            <li>Copia el enlace y pégalo aquí.</li>
          </ol>
        </aside>
      </div>
    </div>
  );
}
