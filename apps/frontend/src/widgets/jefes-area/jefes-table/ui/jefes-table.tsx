import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FastActions } from '@shared/ui/FastActions';
import type { JefeArea } from '@entities/model-jefes-area';
import { useEntityTable } from '@shared/hooks/useEntityTable';
import { useAccionDelPadron } from '@shared/hooks/use-accion-del-padron';
import { AvisoDeError } from '@shared/ui/AvisoDeError';
import { EntityTable } from '@shared/ui/EntityTable';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { TableCell, TableHead, TableRow } from '@shared/ui/table';
import { Badge } from '@shared/ui/badge';
import { jefesAreaApi } from '@shared/api/jefes-area.api';

const jefeFilter = (jefe: JefeArea, params: URLSearchParams) => {
  const searchQuery = params.get('search') || '';
  const nivelFilter = params.get('nivel') || '';
  const estadoFilter = params.get('estado') || '';
  const matchSearch =
    !searchQuery ||
    jefe.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
    jefe.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    jefe.dni.includes(searchQuery);
  const matchNivel = !nivelFilter || jefe.nivelEducativo === nivelFilter;
  const matchEstado = !estadoFilter || (estadoFilter === 'Activo' ? jefe.activo : !jefe.activo);
  return matchSearch && matchNivel && matchEstado;
};

interface JefesTableWidgetProps {
  jefes: JefeArea[];
  onEdit?: (jefe: JefeArea) => void;
  onView: (jefe: JefeArea) => void;
  onChanged?: () => void;
}

export const JefesTableWidget = ({ jefes, onEdit, onView, onChanged }: JefesTableWidgetProps) => {
  const navigate = useNavigate();
  const [finalizingDoc, setFinalizingDoc] = useState<JefeArea | null>(null);
  const [restoringDoc, setRestoringDoc] = useState<JefeArea | null>(null);

  const pagination = useEntityTable({ data: jefes, filterFn: jefeFilter });
  const { error, setError, ejecutar } = useAccionDelPadron();

  const confirmFinalize = async () => {
    if (!finalizingDoc) return;
    const ok = await ejecutar(
      () => jefesAreaApi.deactivate(finalizingDoc.id),
      'Error al desactivar el registro de jefe de área.',
      () => setFinalizingDoc(null),
    );
    if (ok) onChanged?.();
  };

  const confirmRestore = async () => {
    if (!restoringDoc) return;
    const ok = await ejecutar(
      () => jefesAreaApi.activate(restoringDoc.id),
      'Error al reactivar el registro de jefe de área.',
      () => setRestoringDoc(null),
    );
    if (ok) onChanged?.();
  };

  return (
    <>
      <AvisoDeError mensaje={error} onCerrar={() => setError(null)} />

      <EntityTable
        header={
          <>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider pl-5">DNI</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Apellidos y Nombres</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Nivel a Cargo</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Especialidad</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Carga Horaria</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Estado</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider text-right pr-5">Acciones</TableHead>
          </>
        }
        pagination={pagination}
        emptyMessage="No se encontraron jefes de área con los filtros seleccionados."
        emptyColSpan={7}
        itemName="jefes de área"
      >
        {pagination.pageItems.map((doc) => (
          <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
            <TableCell className="font-semibold pl-5 text-text">{doc.dni}</TableCell>
            <TableCell>
              <div className="font-bold text-text">{doc.apellidos}, {doc.nombres}</div>
              <div className="text-xs text-text-muted mt-0.5">{doc.correo} | Cel: {doc.celular}</div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-[0.6rem] py-0 px-1.5 uppercase font-bold bg-primary/10 text-primary border-primary/20">
                {doc.nivelEducativo}
              </Badge>
            </TableCell>
            <TableCell className="font-medium text-text text-xs">
              <div>
                <span className="font-semibold text-text">{doc.especialidad || 'No especificada'}</span>
                {(doc.especialidadesExtras?.length ?? 0) > 0 && (
                  <span className="text-text-muted text-[0.7rem] block">Adicionales: {doc.especialidadesExtras?.join(', ')}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium text-text text-xs">{doc.cargaHoraria} hrs</TableCell>
            <TableCell>
              <Badge
                variant={doc.activo ? 'default' : 'secondary'}
                className={`text-[0.65rem] py-0 px-2 uppercase font-bold ${doc.activo ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}
              >
                {doc.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
            <TableCell className="text-right pr-5">
              <FastActions
                onView={() => onView(doc)}
                onEdit={doc.activo ? () => { if (onEdit) onEdit(doc); else navigate(`/jefes-area/${doc.id}/editar`); } : undefined}
                onFinalize={doc.activo ? () => setFinalizingDoc(doc) : undefined}
                onRestore={!doc.activo ? () => setRestoringDoc(doc) : undefined}
                viewTitle="Ver ficha"
                restoreTitle="Reactivar jefe de área"
                finalizeTitle="Desactivar jefe de área"
              />
            </TableCell>
          </TableRow>
        ))}
      </EntityTable>

      {finalizingDoc && (
        <ConfirmModal
          danger
          title="¿Desactivar Jefe de Área?"
          message={`Esta acción cambiará el estado de ${finalizingDoc.apellidos}, ${finalizingDoc.nombres} a Inactivo.`}
          confirmLabel="Desactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmFinalize}
          onCancel={() => setFinalizingDoc(null)}
        />
      )}

      {restoringDoc && (
        <ConfirmModal
          title="¿Reactivar Jefe de Área?"
          message={`Esta acción reactivará el registro de ${restoringDoc.apellidos}, ${restoringDoc.nombres} en el sistema.`}
          confirmLabel="Reactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmRestore}
          onCancel={() => setRestoringDoc(null)}
        />
      )}
    </>
  );
};
