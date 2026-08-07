import type { ReactNode } from 'react';
import { BookOpen, Calendar, Compass, Layers, User, X } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import type { Cronograma } from '@entities/model-cronogramas';

interface ModalDetalleCronogramaProps {
  cronograma: Cronograma;
  /** El director trabaja en una sola institución: no hace falta nombrarla. */
  esDirector: boolean;
  onCerrar: () => void;
  formatearFechaHora: (iso: string) => { datePart: string; timePart: string };
  colorDeIniciales: (iniciales: string) => string;
  estiloTipo: (tipo: Cronograma['tipo']) => string;
  estiloEstado: (estado: Cronograma['estado']) => string;
}

const Separador = () => <div className="border-t border-border/60 my-1" />;

const Dato = ({
  etiqueta,
  icono,
  children,
}: {
  etiqueta: string;
  icono?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
      {icono}
      {etiqueta}
    </span>
    {children}
  </div>
);

/** Ficha de sólo lectura de una visita programada. */
export const ModalDetalleCronograma = ({
  cronograma,
  esDirector,
  onCerrar,
  formatearFechaHora,
  colorDeIniciales,
  estiloTipo,
  estiloEstado,
}: ModalDetalleCronogramaProps) => {
  const { datePart, timePart } = formatearFechaHora(cronograma.fechaHora);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Detalle del Cronograma
          </h3>
          <button
            onClick={onCerrar}
            className="p-1 hover:bg-muted text-text-muted hover:text-text rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/80">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colorDeIniciales(
                  cronograma.especialistaInitials,
                )}`}
              >
                {cronograma.especialistaInitials}
              </div>
              <div>
                <div className="text-xs text-text-muted">
                  {esDirector ? 'Evaluador' : 'Especialista Asignado'}
                </div>
                <div className="text-sm font-bold text-text">{cronograma.especialista}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Dato etiqueta="Modalidad">
                <span className="text-xs font-semibold text-text">{cronograma.modalidad}</span>
              </Dato>
              <Dato etiqueta="Nivel Educativo">
                <span className="text-xs font-semibold text-text">{cronograma.nivel}</span>
              </Dato>
            </div>

            <Separador />

            <div className="grid grid-cols-2 gap-4">
              <Dato
                etiqueta="Fecha y Hora"
                icono={<Calendar className="w-3 h-3 text-text-muted/80" />}
              >
                <>
                  <span className="text-xs font-semibold text-text">{datePart}</span>
                  <span className="text-[10px] text-text-muted">{timePart}</span>
                </>
              </Dato>

              <Dato etiqueta="Nº de Visita" icono={<Layers className="w-3 h-3 text-text-muted/80" />}>
                <span className="text-xs font-bold text-text">{cronograma.nroVisita}</span>
              </Dato>
            </div>

            <Separador />

            {!esDirector && (
              <Dato
                etiqueta="Institución Educativa"
                icono={<BookOpen className="w-3 h-3 text-text-muted/80" />}
              >
                <span className="text-xs font-semibold text-text">{cronograma.institucion}</span>
              </Dato>
            )}

            <Dato
              etiqueta={esDirector ? 'Evaluado' : 'Docente / Directivo Monitoreado'}
              icono={<User className="w-3 h-3 text-text-muted/80" />}
            >
              <span className="text-xs font-semibold text-text">
                {cronograma.docenteDirectivo}
              </span>
            </Dato>

            <Separador />

            <div className="grid grid-cols-2 gap-4">
              <Dato etiqueta="Tipo de Monitoreo">
                <div>
                  <Badge
                    className={`text-[9px] font-bold px-2 py-0.5 rounded ${estiloTipo(cronograma.tipo)}`}
                  >
                    {cronograma.tipo}
                  </Badge>
                </div>
              </Dato>

              <Dato etiqueta="Estado Actual">
                <div>
                  <Badge
                    className={`text-[9px] font-bold px-2 py-0.5 rounded ${estiloEstado(cronograma.estado)}`}
                  >
                    {cronograma.estado}
                  </Badge>
                </div>
              </Dato>
            </div>

            {cronograma.observaciones && (
              <>
                <Separador />
                <Dato etiqueta="Observaciones">
                  <span className="text-xs text-text bg-muted/30 rounded-lg p-2.5 border border-border/60">
                    {cronograma.observaciones}
                  </span>
                </Dato>
              </>
            )}
          </div>

          <div className="flex justify-end mt-4 border-t border-border pt-4">
            <Button
              onClick={onCerrar}
              className="bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition-colors"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
