import { Compass, Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/ui/table';
import { TablePagination } from '@shared/ui/table-pagination';
import type { Cronograma } from '@entities/model-cronogramas';

/** Estados en los que una visita todavía admite cambios. */
const ESTADOS_EDITABLES: readonly Cronograma['estado'][] = ['PROGRAMADO', 'REPROGRAMADO'];

interface TablaCronogramasProps {
  cronogramas: Cronograma[];
  /** El director ve una sola institución: esa columna no le aporta nada. */
  esDirector: boolean;
  paginacion: {
    desde: number;
    hasta: number;
    total: number;
    pagina: number;
    totalPaginas: number;
    onPagina: (pagina: number) => void;
  };
  onVer: (cronograma: Cronograma) => void;
  onEditar: (cronograma: Cronograma) => void;
  onEliminar: (id: string) => void;
  /** Formatea la fecha en día y hora por separado. */
  formatearFechaHora: (iso: string) => { datePart: string; timePart: string };
  /** Color del círculo de iniciales del especialista. */
  colorDeIniciales: (iniciales: string) => string;
  estiloTipo: (tipo: Cronograma['tipo']) => string;
  estiloEstado: (estado: Cronograma['estado']) => string;
}

const CLASES_ENCABEZADO = 'font-bold text-[0.7rem] uppercase tracking-wider py-3';

/** Listado de visitas programadas. */
export const TablaCronogramas = ({
  cronogramas,
  esDirector,
  paginacion,
  onVer,
  onEditar,
  onEliminar,
  formatearFechaHora,
  colorDeIniciales,
  estiloTipo,
  estiloEstado,
}: TablaCronogramasProps) => (
  <Card className="p-0 border border-border shadow-xs overflow-hidden rounded-2xl">
    <div className="overflow-x-auto w-full">
      <Table>
        <TableHeader className="bg-muted/40 border-b border-border/80">
          <TableRow>
            <TableHead className={`${CLASES_ENCABEZADO} pl-5`}>Fecha y Hora</TableHead>
            <TableHead className={CLASES_ENCABEZADO}>
              {esDirector ? 'Evaluador' : 'Especialista'}
            </TableHead>
            {!esDirector && <TableHead className={CLASES_ENCABEZADO}>Institución</TableHead>}
            <TableHead className={CLASES_ENCABEZADO}>
              {esDirector ? 'Evaluado' : 'Docente/Directivo'}
            </TableHead>
            <TableHead className={CLASES_ENCABEZADO}>Tipo</TableHead>
            <TableHead className={`${CLASES_ENCABEZADO} text-center`}>Nº Visita</TableHead>
            <TableHead className={CLASES_ENCABEZADO}>Estado</TableHead>
            <TableHead className={`${CLASES_ENCABEZADO} text-right pr-5`}>Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {cronogramas.map((item) => {
            const { datePart, timePart } = formatearFechaHora(item.fechaHora);
            // El director sólo interviene sobre monitoreos a docentes: los
            // directivos los programa la UGEL.
            const puedeIntervenir =
              (!esDirector || item.tipo === 'DOCENTE') && ESTADOS_EDITABLES.includes(item.estado);

            return (
              <TableRow
                key={item.id}
                className="hover:bg-muted/30 transition-colors border-b border-border/50"
              >
                <TableCell className="pl-5 text-xs text-text leading-normal">
                  <div className="flex flex-col">
                    <span className="font-bold">{datePart}</span>
                    <span className="text-[10px] text-text-muted">{timePart}</span>
                  </div>
                </TableCell>

                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${colorDeIniciales(
                        item.especialistaInitials,
                      )}`}
                    >
                      {item.especialistaInitials}
                    </div>
                    <span className="text-xs font-bold text-text truncate max-w-[120px]">
                      {item.especialista}
                    </span>
                  </div>
                </TableCell>

                {!esDirector && (
                  <TableCell className="text-xs font-medium text-text truncate max-w-[140px]">
                    {item.institucion}
                  </TableCell>
                )}

                <TableCell className="text-xs text-text truncate max-w-[150px]">
                  {item.docenteDirectivo}
                </TableCell>

                <TableCell>
                  <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded ${estiloTipo(item.tipo)}`}>
                    {item.tipo}
                  </Badge>
                </TableCell>

                <TableCell className="text-center font-bold text-xs text-text">
                  {item.nroVisita}
                </TableCell>

                <TableCell>
                  <Badge
                    className={`text-[9px] font-bold px-2 py-0.5 rounded ${estiloEstado(item.estado)}`}
                  >
                    {item.estado}
                  </Badge>
                </TableCell>

                <TableCell className="text-right pr-5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onVer(item)}
                      className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10 transition-colors rounded-lg cursor-pointer"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {puedeIntervenir && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditar(item)}
                          className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10 transition-colors rounded-lg cursor-pointer"
                          title="Editar cronograma"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEliminar(item.id)}
                          className="h-8 w-8 text-text-muted hover:text-destructive hover:bg-destructive/15 transition-colors rounded-lg cursor-pointer"
                          title="Eliminar cronograma"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}

          {cronogramas.length === 0 && (
            <TableRow>
              <TableCell colSpan={esDirector ? 7 : 8} className="text-center text-text-muted py-16">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Compass className="w-9 h-9 text-text-muted/55" strokeWidth={1.5} />
                  <span className="text-xs font-medium">
                    No se encontraron cronogramas con los criterios seleccionados.
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    <TablePagination
      from={paginacion.total > 0 ? paginacion.desde + 1 : 0}
      to={paginacion.hasta}
      totalItems={paginacion.total}
      currentPage={paginacion.pagina}
      totalPages={paginacion.totalPaginas}
      onPageChange={paginacion.onPagina}
      itemName="cronogramas"
    />
  </Card>
);
