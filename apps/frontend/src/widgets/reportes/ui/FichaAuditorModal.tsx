import { useState, useMemo } from 'react';
import { CheckCircle2, FileText, X, Clock, Download, AlertCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import type { Cronograma } from '@entities/model-cronogramas';
import type { Plantilla } from '@entities/model-plantillas';
import { formatearFechaEnPalabras } from '@shared/lib/fecha/fecha';
import { desempenosAuditados, resumenDeAuditoria } from '@features/reportes/lib/auditoria-ficha';
import { ListaDeDesempenos } from './ficha-auditor/ListaDeDesempenos';
import { DetalleDeDesempeno } from './ficha-auditor/DetalleDeDesempeno';
import { EjesEItemsAuditados } from './ficha-auditor/EjesEItemsAuditados';

/**
 * Auditoría de una ficha de monitoreo finalizada.
 *
 * Eran 353 líneas. Dos defectos vivían en la lista lateral, que es justamente
 * lo que alguien mira para verificar qué se registró: el nivel se mostraba con
 * `|| 'III'` —un desempeño sin calificar aparecía como logro esperado— y la
 * marca verde de verificado se dibujaba sin condición alguna, de modo que ese
 * mismo desempeño salía como «Nivel III ✓».
 */

interface FichaAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Cronograma;
  template: Plantilla;
  fichaState: {
    checkedAspects: Record<string, boolean>;
    selectedLevels: Record<string, string>;
    generalComments: string;
    sugerencias?: string;
    compromisos?: string;
    preguntaExtraAnswers?: Record<string, boolean>;
    respuestasEjeItem?: Record<string, number>;
    evidenciaUrls?: Record<string, string>;
    observacionesEjeItem?: Record<string, string>;
  };
  downloadingId: string | null;
  onDownloadPDF: (visit: Cronograma, e: React.MouseEvent) => void;
}

export const FichaAuditorModal = ({
  isOpen,
  onClose,
  visit,
  template,
  fichaState,
  downloadingId,
  onDownloadPDF,
}: FichaAuditorModalProps) => {
  const [elegidoId, setElegidoId] = useState<string | null>(null);

  const auditados = useMemo(
    () => desempenosAuditados(template?.desempenos ?? [], fichaState?.selectedLevels ?? {}),
    [template, fichaState],
  );

  const resumen = resumenDeAuditoria(auditados);

  // Se abre en el primero mientras nadie elija otro; si el elegido ya no está
  // en la plantilla, se vuelve al primero.
  const abierto =
    auditados.find((d) => d.id === elegidoId) ?? auditados[0] ?? null;

  const desempeno = template?.desempenos.find((d) => d.id === abierto?.id) ?? null;

  if (!isOpen || !visit || !template || !fichaState) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[1250px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              Auditoría de Ficha de Monitoreo Finalizada
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {template.tipoMonitoreo} ({template.anioAcademico})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar auditoría"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-primary-light border-b border-primary/5 text-xs text-slate-600 font-bold grid grid-cols-2 md:grid-cols-4 gap-4 shadow-inner">
          <Metadato rotulo="I.E. Monitoreada" valor={visit.institucion} />
          <Metadato rotulo="Evaluado" valor={visit.docenteDirectivo} />
          <Metadato rotulo="Especialista" valor={visit.especialista} />
          <Metadato rotulo="Fecha Ejecución" valor={formatearFechaEnPalabras(visit.fechaHora)} />
        </div>

        {/* Una ficha finalizada con desempeños sin calificar es lo que la
            auditoría tiene que hacer visible, no algo que deba disimularse. */}
        {!resumen.completa && resumen.total > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {resumen.sinCalificar} de {resumen.total} desempeños quedaron sin calificar en esta
              ficha.
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <ListaDeDesempenos
            desempenos={auditados}
            seleccionadoId={abierto?.id ?? ''}
            onSeleccionar={setElegidoId}
          />

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <DetalleDeDesempeno
              desempeno={desempeno}
              niveles={template.niveles}
              nivelRegistrado={abierto?.nivel ?? null}
              respuestaExtra={
                desempeno ? fichaState.preguntaExtraAnswers?.[desempeno.id] : undefined
              }
            />

            {!!template.ejesItems?.length && (
              <EjesEItemsAuditados
                items={template.ejesItems}
                niveles={template.niveles}
                respuestas={fichaState.respuestasEjeItem}
                observaciones={fichaState.observacionesEjeItem}
              />
            )}
          </div>
        </div>

        <div className="p-5 border-t border-border bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextoRegistrado rotulo="Sugerencias" texto={fichaState.sugerencias} />
          <TextoRegistrado rotulo="Compromisos" texto={fichaState.compromisos} />
        </div>

        <div className="p-4 border-t border-border bg-slate-50 flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Cerrado y Firmado Digitalmente por la UGEL</span>
          </span>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={(e) => onDownloadPDF(visit, e)}
              disabled={downloadingId === visit.id}
              className="border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 h-10 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
            >
              {downloadingId === visit.id ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Exportar PDF</span>
            </Button>
            <Button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-6 py-2.5 h-10 rounded-xl cursor-pointer shadow-sm"
            >
              Cerrar Auditoría
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Metadato = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div>
    {rotulo}: <span className="text-slate-800">{valor}</span>
  </div>
);

const TextoRegistrado = ({ rotulo, texto }: { rotulo: string; texto?: string }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
      {rotulo}
    </span>
    <div className="bg-surface border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed shadow-inner min-h-[3rem]">
      {texto || <span className="text-slate-400 italic">Sin registrar</span>}
    </div>
  </div>
);
