import { CheckCircle2, ClipboardList, Clock, GraduationCap, XCircle } from 'lucide-react';
import type { ISolicitudPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Piezas que comparten la bandeja del Jefe de Gestión y el seguimiento del
 * director. Las dos pantallas muestran el mismo pedido desde lados distintos,
 * de modo que el estado y el detalle se declaran una sola vez.
 */

const ESTILOS = {
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber-50 text-amber-800 border-amber-200', Icono: Clock },
  APROBADA: {
    texto: 'Aprobada',
    clase: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Icono: CheckCircle2,
  },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-red-50 text-red-800 border-red-200', Icono: XCircle },
} as const;

export function InsigniaEstado({ estado }: { estado: ISolicitudPlantilla['estado'] }) {
  const { texto, clase, Icono } = ESTILOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${clase}`}
    >
      <Icono className="h-3.5 w-3.5" />
      {texto}
    </span>
  );
}

/** Rótulo legible del instrumento. El contrato usa el valor tipado. */
const ROTULO_INSTRUMENTO: Record<string, string> = {
  DOCENTE: 'Docente',
  DOCENTE_EIB: 'Docente EIB',
  DIRECTIVO: 'Directiva',
};

/**
 * Las plantillas pedidas, en píldoras.
 *
 * Vive acá y no en cada pantalla porque las dos —la bandeja de la Jefatura y el
 * seguimiento del director— muestran el mismo pedido. Duplicarlo dejaría dos
 * lenguajes visuales para lo mismo, y el día que cambie uno el otro quedaría
 * viejo sin que nadie lo note.
 *
 * La descripción va en el `title` y no en el cuerpo: un pedido de tres
 * plantillas rompería la fila si cada una arrastrara su párrafo.
 */
export function PildorasDePlantillas({ solicitud }: { solicitud: ISolicitudPlantilla }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {solicitud.items.map((item) => (
        <span
          key={item.id}
          title={item.descripcion}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] max-w-full"
        >
          <ClipboardList className="h-3.5 w-3.5 text-primary shrink-0" />
          <strong className="text-slate-700">
            {ROTULO_INSTRUMENTO[item.instrumento] ?? item.instrumento}
          </strong>
          <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 truncate">{item.cargoBeneficiario}</span>
          {/* Sólo se habla de cupos cuando ya hay decisión: antes no existen. */}
          {solicitud.estado === 'APROBADA' && (
            <span
              className={item.plantillaId ? 'text-slate-400' : 'text-emerald-700 font-bold'}
            >
              · {item.plantillaId ? 'usado' : 'libre'}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
