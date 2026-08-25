import { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CargoBeneficiario,
  INSTRUMENTOS_SOLICITABLES,
  type ISolicitudPlantilla,
  type TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { ErrorDeApi } from '@shared/config/api';
import {
  useCrearSolicitudPlantilla,
  useMisSolicitudesPlantilla,
} from '../api/use-solicitudes-plantilla-api';
import { InsigniaEstado, PildorasDePlantillas } from './EstadoSolicitud';
import { BotonJustificacion } from './BotonJustificacion';
import { DetalleSolicitudDialog } from './DetalleSolicitudDialog';

/**
 * Solicitudes de plantilla de la institución, vistas por su director.
 *
 * El catálogo oficial son las tres fichas de la UGEL. Si la institución
 * necesita un instrumento propio, el director lo pide acá con un PDF que lo
 * justifica y la Jefatura de Gestión decide.
 *
 * El director es la única boca de la institución: también tramita lo que
 * necesitan el Jefe de Taller y el Coordinador Pedagógico, y por eso cada
 * plantilla pedida declara para qué cargo es.
 */

const ETIQUETA_INSTRUMENTO: Record<string, string> = {
  DOCENTE: 'Docente',
  DOCENTE_EIB: 'Docente EIB',
};

interface ItemBorrador {
  instrumento: TipoPlantilla;
  cargoBeneficiario: CargoBeneficiario;
  descripcion: string;
}

const itemVacio = (): ItemBorrador => ({
  instrumento: 'DOCENTE',
  cargoBeneficiario: CargoBeneficiario.DIRECTOR,
  descripcion: '',
});

const motivoDelFallo = (error: unknown, respaldo: string): string =>
  error instanceof ErrorDeApi && error.message ? error.message : respaldo;

function Formulario({ onListo }: { onListo: () => void }) {
  const [anio] = useState(() => new Date().getFullYear());
  const [items, setItems] = useState<ItemBorrador[]>([itemVacio()]);
  const [pdf, setPdf] = useState<File | null>(null);

  /**
   * El `input[type=file]` guarda el archivo elegido en el DOM, no en React.
   * Vaciar el estado no lo borra: hay que limpiar el elemento, o el navegador
   * seguiría mostrando el nombre del PDF que el usuario acaba de quitar.
   */
  const campoPdf = useRef<HTMLInputElement>(null);

  const quitarPdf = () => {
    setPdf(null);
    if (campoPdf.current) campoPdf.current.value = '';
  };

  const crear = useCrearSolicitudPlantilla();

  const cambiar = (i: number, cambio: Partial<ItemBorrador>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...cambio } : it)));

  const completo = pdf !== null && items.every((i) => i.descripcion.trim() !== '');

  const enviar = async () => {
    if (!pdf) return;
    try {
      await crear.mutateAsync({
        dto: {
          anioEscolar: anio,
          items: items.map((i) => ({ ...i, descripcion: i.descripcion.trim() })),
        },
        pdf,
      });
      toast.success('Solicitud presentada. Espere la respuesta de la Jefatura de Gestión.');
      onListo();
    } catch (error) {
      toast.error(motivoDelFallo(error, 'No se pudo presentar la solicitud.'));
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col gap-5">
      <h3 className="text-lg font-semibold">Nueva solicitud · {anio}</h3>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pdf-justificacion">Justificación en PDF</Label>
        <div className="flex items-center gap-2">
          <Input
            id="pdf-justificacion"
            ref={campoPdf}
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
            // El botón del selector nativo viene transparente y se confunde con
            // el borde del campo. Se pinta con el color de la marca para que se
            // lea como la acción que es.
            className="h-10 py-1.5 file:mr-3 file:h-7 file:rounded-md file:bg-primary file:px-3 file:font-semibold file:text-primary-foreground file:cursor-pointer hover:file:opacity-90"
          />
          <Button
            variant="ghost"
            aria-label="Quitar el archivo adjunto"
            // El botón aparece sólo con archivo elegido: uno permanentemente
            // deshabilitado ocupa lugar y no dice nada.
            className={pdf ? '' : 'invisible'}
            disabled={!pdf}
            onClick={quitarPdf}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Explique por qué la institución necesita estas plantillas y qué no cubre la ficha
          oficial.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <Label>¿Qué plantillas necesitan?</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Enumera acá las mismas plantillas que detallas en el PDF. La Jefatura de Gestión
            aprueba esta lista, y tu institución sólo podrá crear las plantillas que figuren en
            ella: una por cada fila.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            El contenido de cada plantilla lo armas después y puede ser completamente nuevo. Acá
            sólo declaras de qué <strong>tipo</strong> es, porque de eso depende en qué visitas se
            aplica, cómo se califica y con qué otras fichas se compara en los reportes.
          </p>
        </div>

        <div className="hidden md:grid grid-cols-[1fr_1fr_2fr_auto] gap-2 text-xs font-semibold text-muted-foreground">
          <span>Tipo de ficha</span>
          <span>¿Quién la va a aplicar?</span>
          <span>¿Para qué la necesitan?</span>
          <span className="w-10" />
        </div>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-2">
            <select
              aria-label={`Tipo de ficha de la plantilla ${i + 1}`}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={item.instrumento}
              onChange={(e) => cambiar(i, { instrumento: e.target.value as TipoPlantilla })}
            >
              {INSTRUMENTOS_SOLICITABLES.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETA_INSTRUMENTO[valor] ?? valor}
                </option>
              ))}
            </select>

            <select
              aria-label={`Cargo destinatario de la plantilla ${i + 1}`}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={item.cargoBeneficiario}
              onChange={(e) =>
                cambiar(i, { cargoBeneficiario: e.target.value as CargoBeneficiario })
              }
            >
              {Object.values(CargoBeneficiario).map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargo}
                </option>
              ))}
            </select>

            <Input
              aria-label={`Descripción de la plantilla ${i + 1}`}
              placeholder="Ej.: observación del taller de carpintería"
              maxLength={300}
              value={item.descripcion}
              onChange={(e) => cambiar(i, { descripcion: e.target.value })}
            />

            <Button
              variant="ghost"
              aria-label={`Quitar la plantilla ${i + 1}`}
              disabled={items.length === 1}
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-fit"
          onClick={() => setItems((prev) => [...prev, itemVacio()])}
        >
          <Plus className="h-4 w-4" />
          Agregar otra plantilla
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={enviar} disabled={!completo || crear.isPending}>
          {crear.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Presentar solicitud
        </Button>
        <Button variant="ghost" onClick={onListo}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function Tarjeta({
  solicitud,
  onAbrir,
}: {
  solicitud: ISolicitudPlantilla;
  onAbrir: () => void;
}) {
  const cuposLibres = solicitud.items.filter((i) => i.plantillaId === null).length;

  return (
    // No es un `button` como la tarjeta de la Jefatura porque lleva otro botón
    // adentro —el de la justificación—, y anidar controles rompe el teclado y
    // el lector de pantalla. El hover se conserva para que se lea igual.
    <div className="bg-white rounded-xl border border-border shadow-xs p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-800 tracking-tight">
              Solicitud {solicitud.anioEscolar}
            </h3>
            <InsigniaEstado estado={solicitud.estado} />
          </div>
          <p className="text-xs text-muted-foreground">Presentada por {solicitud.solicitante}</p>
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

      {/* El motivo del rechazo es lo que el director necesita para corregir:
          va en la tarjeta y no escondido en el detalle. */}
      {solicitud.comentario && (
        <p
          className={`text-sm rounded-lg p-3 ${
            solicitud.estado === 'RECHAZADA'
              ? 'bg-red-50 text-red-900 border border-red-100'
              : 'bg-slate-50 text-slate-700 border border-slate-100'
          }`}
        >
          <strong>
            {solicitud.estado === 'RECHAZADA' ? 'Motivo del rechazo' : 'Nota de la Jefatura'}:
          </strong>{' '}
          {solicitud.comentario}
        </p>
      )}

      {/* Mismo pie que la bandeja de la Jefatura: el dato del pedido a la
          izquierda, el acceso al detalle a la derecha. Las dos pantallas
          muestran el mismo objeto y deben leerse igual. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {solicitud.estado === 'APROBADA'
              ? `${cuposLibres} de ${solicitud.items.length} cupos sin usar`
              : `${solicitud.items.length} ${
                  solicitud.items.length === 1 ? 'plantilla solicitada' : 'plantillas solicitadas'
                }`}
          </span>
          <BotonJustificacion solicitudId={solicitud.id} />
        </div>

        <button
          type="button"
          onClick={onAbrir}
          className="text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          Ver detalle y trazabilidad →
        </button>
      </div>
    </div>
  );
}

export function MisSolicitudesPlantillaPage() {
  const [creando, setCreando] = useState(false);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useMisSolicitudesPlantilla();

  const solicitudes = data?.solicitudes ?? [];
  const abierta = solicitudes.find((s) => s.id === abiertaId) ?? null;
  const hayPendiente = solicitudes.some((s) => s.estado === 'PENDIENTE');

  /**
   * Cupos aprobados que todavía no se usaron.
   *
   * Es el dato que le cambia el día al director: le dice cuántas plantillas
   * puede crear ahora mismo. Un contador de «solicitudes presentadas» sería
   * simetría con la bandeja de la Jefatura, pero a él no le sirve de nada.
   */
  const cuposLibres = solicitudes
    .filter((s) => s.estado === 'APROBADA')
    .flatMap((s) => s.items)
    .filter((i) => i.plantillaId === null).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <ClipboardList className="w-6 h-6 text-primary" />
            Solicitudes de Plantilla
          </h1>
          <p className="text-sm text-muted-foreground">
            Pide autorización a la Jefatura de Gestión para que tu institución use plantillas
            propias además de las tres fichas oficiales.
          </p>
        </div>

        {!creando && (
          <Button
            onClick={() => setCreando(true)}
            // Un segundo pedido abierto deja a la Jefatura decidiendo sobre
            // información que se contradice. El backend también lo rechaza.
            disabled={hayPendiente}
            title={
              hayPendiente
                ? 'Ya tienes una solicitud pendiente. Espera la respuesta antes de presentar otra.'
                : undefined
            }
          >
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </Button>
        )}
      </div>

      {/* El estado del trámite, en una línea, arriba de todo: es lo primero que
          el director viene a mirar. */}
      {!creando && (
        <Card
          className={`p-4 flex flex-wrap items-center justify-between gap-3 border ${
            cuposLibres > 0
              ? 'border-emerald-200 bg-emerald-50'
              : hayPendiente
                ? 'border-amber-200 bg-amber-50'
                : 'border-border bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {cuposLibres > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            ) : hayPendiente ? (
              <Clock className="h-5 w-5 text-amber-700 shrink-0" />
            ) : (
              <ClipboardList className="h-5 w-5 text-slate-400 shrink-0" />
            )}
            <div>
              <p
                className={`text-sm font-bold ${
                  cuposLibres > 0
                    ? 'text-emerald-900'
                    : hayPendiente
                      ? 'text-amber-900'
                      : 'text-slate-700'
                }`}
              >
                {cuposLibres > 0
                  ? `Tienes ${cuposLibres} ${cuposLibres === 1 ? 'plantilla autorizada' : 'plantillas autorizadas'} sin crear`
                  : hayPendiente
                    ? 'Tu solicitud está esperando respuesta'
                    : 'Sin autorizaciones pendientes de usar'}
              </p>
              <p className="text-xs text-muted-foreground">
                {cuposLibres > 0
                  ? 'Créalas desde el catálogo de plantillas de tu institución.'
                  : hayPendiente
                    ? 'No puedes presentar otra hasta que la Jefatura resuelva ésta.'
                    : 'Las tres fichas oficiales de la UGEL están disponibles sin trámite.'}
              </p>
            </div>
          </div>

          {cuposLibres > 0 && (
            <Link
              to="/plantillas?filtro=ie"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              Ir a crear la plantilla
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </Card>
      )}

      {creando && <Formulario onListo={() => setCreando(false)} />}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : isError ? (
        /* Un fallo de red no puede leerse como «no presentaste solicitudes»:
           el director creería que su pedido se perdió. */
        <Card
          role="alert"
          className="p-8 text-center border-destructive/20 bg-destructive/5 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-destructive">
            No se pudieron cargar tus solicitudes. Esto no significa que no las hayas presentado.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reintentar
          </Button>
        </Card>
      ) : solicitudes.length === 0 ? (
        <Card className="p-10 text-center border-border flex flex-col items-center gap-2">
          <Inbox className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">
            Tu institución todavía no presentó solicitudes.
          </p>
          <p className="text-xs text-muted-foreground">
            Las tres fichas oficiales de la UGEL están disponibles sin trámite.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {solicitudes.map((s) => (
            <Tarjeta key={s.id} solicitud={s} onAbrir={() => setAbiertaId(s.id)} />
          ))}
        </div>
      )}

      {/* El director ve la misma trazabilidad que la Jefatura, sin poder decidir. */}
      <DetalleSolicitudDialog
        solicitud={abierta}
        puedeDecidir={false}
        onClose={() => setAbiertaId(null)}
      />
    </div>
  );
}
