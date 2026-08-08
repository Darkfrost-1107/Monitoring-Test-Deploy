import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FastActions } from '@shared/ui/FastActions';
import type { Especialista } from '@entities/model-especialistas';
import { CARGO_COLORS } from '@entities/model-especialistas';
import { useEntityTable } from '@shared/hooks/useEntityTable';
import { useAccionDelPadron } from '@shared/hooks/use-accion-del-padron';
import { AvisoDeError } from '@shared/ui/AvisoDeError';
import { EntityTable } from '@shared/ui/EntityTable';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { TableCell, TableHead, TableRow } from '@shared/ui/table';
import { Badge } from '@shared/ui/badge';

import { especialistasApi } from '@shared/api/especialistas.api';

const especialistaFilter = (esp: Especialista, params: URLSearchParams) => {
  const searchQuery = params.get('search') || '';
  const nivelFilter = params.get('nivel') || '';
  const estadoFilter = params.get('estado') || '';
  const matchSearch =
    !searchQuery ||
    esp.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
    esp.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    esp.dni.includes(searchQuery) ||
    (esp.especialidades?.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase())) || false);
  const matchNivel = !nivelFilter || esp.nivelEducativo === nivelFilter;
  const matchEstado = !estadoFilter || (estadoFilter === 'Activo' ? esp.activo : !esp.activo);
  return matchSearch && matchNivel && matchEstado;
};

interface EspecialistasTableWidgetProps {
  especialistas: Especialista[];
  setEspecialistas: React.Dispatch<React.SetStateAction<Especialista[]>>;
  onEdit?: (especialista: Especialista) => void;
  onView: (especialista: Especialista) => void;
}

export const EspecialistasTableWidget = ({
  especialistas,
  setEspecialistas,
  onEdit,
  onView,
}: EspecialistasTableWidgetProps) => {
  const navigate = useNavigate();
  const [finalizingDoc, setFinalizingDoc] = useState<Especialista | null>(null);
  const [restoringDoc, setRestoringDoc] = useState<Especialista | null>(null);

  const pagination = useEntityTable({ data: especialistas, filterFn: especialistaFilter });

  const { error, setError, ejecutar } = useAccionDelPadron();

  const confirmFinalize = async () => {
    if (!finalizingDoc) return;
    const id = finalizingDoc.id;

    const ok = await ejecutar(
      () => especialistasApi.deactivate(id),
      'Error al desactivar el registro de especialista.',
      () => setFinalizingDoc(null),
    );
    if (!ok) return;

    setEspecialistas((prev) => prev.map((e) => (e.id === id ? { ...e, activo: false } : e)));
  };

  const confirmRestore = async () => {
    if (!restoringDoc) return;
    const id = restoringDoc.id;

    const ok = await ejecutar(
      () => especialistasApi.activate(id),
      'Error al reactivar el registro de especialista.',
      () => setRestoringDoc(null),
    );
    if (!ok) return;

    setEspecialistas((prev) => prev.map((e) => (e.id === id ? { ...e, activo: true } : e)));
  };

  return (
    <>
      <AvisoDeError mensaje={error} onCerrar={() => setError(null)} />

      <EntityTable
        header={
          <>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider pl-5">DNI</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Apellidos y Nombres</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Rol de Especialista</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Especialidad</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Niveles Asignados</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Estado</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider text-right pr-5">Acciones</TableHead>
          </>
        }
        pagination={pagination}
        emptyMessage="No se encontraron especialistas con los filtros seleccionados."
        emptyColSpan={7}
        itemName="especialistas"
      >
        {pagination.pageItems.map((doc) => (
          <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
            <TableCell className="font-semibold pl-5 text-text">{doc.dni}</TableCell>
            <TableCell>
              <div className="font-bold text-text">{doc.apellidos}, {doc.nombres}</div>
              <div className="text-xs text-text-muted mt-0.5">{doc.correo} | Cel: {doc.celular}</div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CARGO_COLORS[doc.cargo || 'Especialista'] || '#3b82f6' }} />
                <span className="text-xs font-semibold text-text">{doc.cargo || 'Especialista'}</span>
              </div>
            </TableCell>
            <TableCell className="font-medium text-text text-xs">
              <div>
                <span className="font-semibold text-text">{doc.especialidad || 'No especificada'}</span>
                {(doc.especialidadesExtras?.length ?? 0) > 0 && (
                  <span className="text-text-muted text-[0.7rem] block">Adicionales: {doc.especialidadesExtras?.join(', ')}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {doc.nivelEducativo && (
                  <Badge variant="secondary" className="text-[0.6rem] py-0 px-1.5 uppercase font-bold">
                    {doc.nivelEducativo}{doc.modalidad ? ` (${doc.modalidad})` : ''}
                  </Badge>
                )}
              </div>
            </TableCell>
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
                onEdit={doc.activo ? () => { if (onEdit) onEdit(doc); else navigate(`/especialistas/${doc.id}/editar`); } : undefined}
                onFinalize={doc.activo ? () => setFinalizingDoc(doc) : undefined}
                onRestore={!doc.activo ? () => setRestoringDoc(doc) : undefined}
                viewTitle="Ver ficha"
                restoreTitle="Reactivar especialista"
                finalizeTitle="Desactivar especialista"
              />
            </TableCell>
          </TableRow>
        ))}
      </EntityTable>

      {finalizingDoc && (
        <ConfirmModal
          danger
          title="¿Desactivar Especialista?"
          message={`Esta acción cambiará el estado de ${finalizingDoc.apellidos}, ${finalizingDoc.nombres} a Inactivo.`}
          confirmLabel="Desactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmFinalize}
          onCancel={() => setFinalizingDoc(null)}
        />
      )}

      {restoringDoc && (
        <ConfirmModal
          title="¿Reactivar Especialista?"
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
