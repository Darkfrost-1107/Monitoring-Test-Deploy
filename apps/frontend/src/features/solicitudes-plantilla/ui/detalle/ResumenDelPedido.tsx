import { BookOpen, ClipboardList, GraduationCap } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import type { ISolicitudPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Columna izquierda del detalle: de qué institución es el pedido y qué se
 * está pidiendo exactamente.
 *
 * Cada fila es un cupo. Se marca si ya se usó, porque una aprobación con saldo
 * y una agotada se leen igual en la bandeja y significan cosas distintas: sobre
 * la primera todavía se puede crear una plantilla.
 */

const PALETA_DE_ESTADO: Record<string, string> = {
  APROBADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZADA: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ROTULO_INSTRUMENTO: Record<string, string> = {
  DOCENTE: 'Ficha Docente',
  DOCENTE_EIB: 'Ficha Docente EIB',
  DIRECTIVO: 'Ficha Directiva',
};

export const ResumenDelPedido = ({ solicitud }: { solicitud: ISolicitudPlantilla }) => (
  <div className="w-full lg:w-80 border-r border-border p-5 bg-slate-50/50 space-y-5 overflow-y-auto shrink-0">
    <div className="space-y-3">
      <Titulo>Información Base</Titulo>

      <Dato rotulo="ID Solicitud">
        <Badge
          variant="outline"
          className="text-xs font-black bg-slate-100 border-slate-200 text-slate-700"
        >
          {solicitud.id}
        </Badge>
      </Dato>

      <Dato rotulo="Institución Educativa">
        <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
          <BookOpen className="h-4.5 w-4.5 text-primary" />
          {solicitud.institucionNombre}
        </div>
      </Dato>

      <Dato rotulo="Presentada por">
        <div className="text-xs font-extrabold text-slate-800">{solicitud.solicitante}</div>
      </Dato>

      <Dato rotulo="Año escolar">
        <div className="text-xs font-extrabold text-slate-800">{solicitud.anioEscolar}</div>
      </Dato>

      <Dato rotulo="Estado actual">
        <Badge
          variant="outline"
          className={`text-[10px] font-black tracking-wide ${PALETA_DE_ESTADO[solicitud.estado]}`}
        >
          {solicitud.estado}
        </Badge>
      </Dato>
    </div>

    <div className="space-y-3 border-t border-slate-200 pt-4">
      <Titulo>Plantillas Solicitadas</Titulo>

      {solicitud.items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 shadow-xs"
        >
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
            <ClipboardList className="h-4 w-4 text-primary shrink-0" />
            {ROTULO_INSTRUMENTO[item.instrumento] ?? item.instrumento}
          </div>
          {/*
            A quién se destina el cupo, que es quien podrá crear y aplicar la
            ficha. El cargo se muestra al lado como aclaración: dos personas
            pueden ocupar el mismo, y antes la fila sólo decía el cargo.
          */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            {item.beneficiarioNombre ? (
              <span>
                {item.beneficiarioNombre}
                <span className="text-slate-400"> · {item.cargoBeneficiario}</span>
              </span>
            ) : (
              item.cargoBeneficiario
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">{item.descripcion}</p>

          {solicitud.estado === 'APROBADA' && (
            <Badge
              variant="outline"
              className={`text-[9px] font-black tracking-wider ${
                item.plantillaId
                  ? 'bg-slate-50 text-slate-500 border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {item.plantillaId ? 'CUPO USADO' : 'CUPO DISPONIBLE'}
            </Badge>
          )}
        </div>
      ))}
    </div>
  </div>
);

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</h3>
);

const Dato = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{rotulo}</span>
    <div>{children}</div>
  </div>
);
