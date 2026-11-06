import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, ExternalLink, Loader2, Inbox, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@shared/ui/badge';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Button } from '@shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/ui/table';
import { cronogramasApi } from '@features/cronogramas/api/cronogramas.api';
import { requestBlob } from '@shared/config/api';
import { rutaDeDescarga } from '@shared/lib/archivo-guardado';
import type { IOperacionExcepcionalDetalle, TipoAccionExcepcional } from '@sistema-monitoreo/shared-contracts';
import { ModalDetalleOperacionExcepcional } from './ModalDetalleOperacionExcepcional';

const CLASES_ENCABEZADO = 'font-bold text-[0.7rem] uppercase tracking-wider py-3';

export const TablaHistorialMesaPartes = () => {
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | TipoAccionExcepcional>('TODOS');
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<IOperacionExcepcionalDetalle | null>(null);

  const { data: operaciones = [], isLoading } = useQuery({
    queryKey: ['operaciones-excepcionales'],
    queryFn: cronogramasApi.findAllOperacionesExcepcionales,
  });

  const filtradas = useMemo(() => {
    return operaciones.filter((op) => {
      const coincideTipo = tipoFiltro === 'TODOS' || op.tipoAccion === tipoFiltro;
      if (!coincideTipo) return false;

      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase().trim();
      return (
        op.numeroExpediente.toLowerCase().includes(q) ||
        op.evaluadoNombre.toLowerCase().includes(q) ||
        op.evaluadoNumeroDocumento.includes(q) ||
        op.institucionNombre.toLowerCase().includes(q) ||
        op.ejecutadoPorNombre.toLowerCase().includes(q) ||
        op.motivo.toLowerCase().includes(q)
      );
    });
  }, [operaciones, busqueda, tipoFiltro]);

  const abrirSustento = async (op: IOperacionExcepcionalDetalle) => {
    if (!op.archivoSustentoUrl) {
      toast.error('Este trámite no cuenta con archivo de sustento.');
      return;
    }
    const ruta = rutaDeDescarga(op.archivoSustentoUrl);
    if (!ruta) {
      toast.error('Ruta de archivo no válida.');
      return;
    }
    setDescargandoId(op.id);
    try {
      const blob = await requestBlob(ruta);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo abrir el documento de sustento.');
    } finally {
      setDescargandoId(null);
    }
  };

  const formatearFecha = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            type="text"
            placeholder="Buscar por expediente, docente, DNI o I.E..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 text-xs h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="h-9 px-3 text-xs bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="TODOS">Todas las acciones</option>
            <option value="ANULACION_TOTAL">Anulación Total</option>
            <option value="REAPERTURA_FICHA">Reapertura de Ficha</option>
          </select>

          <span className="text-[11px] font-semibold text-text-muted px-2 whitespace-nowrap">
            {filtradas.length} {filtradas.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
      </div>

      {/* Tabla Desahogada */}
      <Card className="overflow-hidden border-border bg-surface p-0 shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className={`${CLASES_ENCABEZADO} pl-5 w-36`}>Fecha / Hora</TableHead>
                <TableHead className={`${CLASES_ENCABEZADO} w-36`}>Expediente</TableHead>
                <TableHead className={`${CLASES_ENCABEZADO} w-36`}>Acción</TableHead>
                <TableHead className={CLASES_ENCABEZADO}>Institución Educativa</TableHead>
                <TableHead className={CLASES_ENCABEZADO}>Docente / Evaluado</TableHead>
                <TableHead className={`${CLASES_ENCABEZADO} text-right pr-5 w-44`}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-text-muted">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span className="text-xs">Cargando historial de trámites excepcionales...</span>
                  </TableCell>
                </TableRow>
              ) : filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-text-muted">
                    <Inbox className="w-10 h-10 mx-auto mb-2 text-text-muted/40" />
                    <p className="text-sm font-semibold text-text">No se encontraron trámites excepcionales</p>
                    <p className="text-xs text-text-muted mt-1">
                      {operaciones.length === 0
                        ? 'Aún no se han ejecutado trámites de Mesa de Partes.'
                        : 'No hay trámites que coincidan con los filtros aplicados.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((op) => (
                  <TableRow
                    key={op.id}
                    className="border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setDetalleSeleccionado(op)}
                  >
                    <TableCell className="pl-5 py-3 text-xs text-text-muted whitespace-nowrap">
                      {formatearFecha(op.createdAt)}
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-mono font-bold text-xs text-text bg-muted/60 px-2 py-0.5 rounded border border-border">
                        {op.numeroExpediente}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      {op.tipoAccion === 'ANULACION_TOTAL' ? (
                        <Badge className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          ANULACIÓN TOTAL
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                          REAPERTURA FICHA
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-text">{op.institucionNombre}</span>
                        {op.institucionCodigoModular && (
                          <span className="text-[10px] text-text-muted font-mono">
                            Cód: {op.institucionCodigoModular}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-text">{op.evaluadoNombre}</span>
                        {op.evaluadoNumeroDocumento && (
                          <span className="text-[10px] text-text-muted">
                            DNI: {op.evaluadoNumeroDocumento}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 pr-5 text-right">
                      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetalleSeleccionado(op)}
                          className="h-7 px-2 text-xs font-semibold text-text-muted hover:text-text hover:bg-muted cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-primary" />
                          Detalle
                        </Button>

                        {op.archivoSustentoUrl && (
                          <button
                            type="button"
                            onClick={() => abrirSustento(op)}
                            disabled={descargandoId === op.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {descargandoId === op.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                            PDF
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal de Detalle */}
      {detalleSeleccionado && (
        <ModalDetalleOperacionExcepcional
          operacion={detalleSeleccionado}
          onCerrar={() => setDetalleSeleccionado(null)}
          onAbrirPdf={abrirSustento}
          descargando={descargandoId === detalleSeleccionado.id}
        />
      )}
    </div>
  );
};
