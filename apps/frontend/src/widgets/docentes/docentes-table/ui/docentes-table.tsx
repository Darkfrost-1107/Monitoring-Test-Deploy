import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FastActions } from '@shared/ui/FastActions';
import type { Docente } from '@entities/model-docentes';

import { useEntityTable } from '@shared/hooks/useEntityTable';
import { EntityTable } from '@shared/ui/EntityTable';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { TableCell, TableHead, TableRow } from '@shared/ui/table';
import { Badge } from '@shared/ui/badge';
import { AlertDialog, AlertDialogContent } from '@shared/ui/alert-dialog';
import { AsignacionEvaluadorWidget } from '@features/docentes/ui/AsignacionEvaluadorWidget';
import { X } from 'lucide-react';

import { teachersApi } from '@shared/api/teachers.api';
import { hoyISO } from '@shared/lib/fecha/fecha';

interface DocentesTableWidgetProps {
  docentes: Docente[];
  setDocentes: React.Dispatch<React.SetStateAction<Docente[]>>;
  onEdit?: (docente: Docente) => void;
  onView: (docente: Docente) => void;
  instituciones: { id: string; nombre: string }[];
  targetCargo?: 'Director' | 'Coordinador Pedagógico' | 'Jefe de Taller' | 'Docente de Aula';
  routePrefix?: string;
  itemName?: string;
}

const docenteFilter = (targetCargo: DocentesTableWidgetProps['targetCargo']) =>
  (doc: Docente, params: URLSearchParams) => {
    const searchQuery = params.get('search') || '';
    const condicionFilter = params.get('condicion') || '';
    const seccionFilter = params.get('seccion') || '';
    const nivelFilter = params.get('nivelEducativo') || '';

    let hasCargo: boolean;
    if (targetCargo === 'Docente de Aula') {
      const hasActiveMonitor = doc.cargosList?.some(
        (c) => c.fechaFin === null && ['Director', 'Coordinador Pedagógico', 'Jefe de Taller'].includes(c.nombre),
      );
      hasCargo = hasActiveMonitor !== undefined ? !hasActiveMonitor : doc.cargo === 'Docente de Aula';
    } else {
      hasCargo = doc.cargosList?.some((c) => c.nombre === targetCargo && c.fechaFin === null) ?? (doc.cargo === targetCargo);
    }
    if (!hasCargo) return false;

    const matchSearch =
      !searchQuery ||
      doc.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.dni.includes(searchQuery);

    const matchCondicion = !condicionFilter || doc.condicion === condicionFilter;
    const matchSeccion =
      !seccionFilter ||
      (doc.secciones || []).some((s) => `${s.grado} ${s.seccion}` === seccionFilter);
    const matchNivel =
      !nivelFilter || doc.nivelEducativo?.toUpperCase() === nivelFilter.toUpperCase();

    return matchSearch && matchCondicion && matchSeccion && matchNivel;
  };

export const DocentesTableWidget = ({
  docentes,
  setDocentes,
  onEdit,
  onView,
  targetCargo = 'Director',
  routePrefix = '/instituciones/docentes',
  itemName = 'directores/docentes',
}: DocentesTableWidgetProps) => {
  const navigate = useNavigate();
  const [deletingDoc, setDeletingDoc] = useState<Docente | null>(null);
  const [restoringDoc, setRestoringDoc] = useState<Docente | null>(null);
  const [finalizingDoc, setFinalizingDoc] = useState<Docente | null>(null);
  const [assigningDoc, setAssigningDoc] = useState<Docente | null>(null);

  const pagination = useEntityTable({ data: docentes, filterFn: docenteFilter(targetCargo) });

  const handleFinalizeClick = (doc: Docente) => {
    const { isMonitorCargo } = getCargoStatus(doc);
    if (isMonitorCargo) {
      setFinalizingDoc(doc);
    } else {
      setDeletingDoc(doc);
    }
  };

  const confirmFinalizeCargo = async () => {
    if (!finalizingDoc) return;
    const targetCargoObj = finalizingDoc.cargosList?.find((c) => c.nombre === targetCargo && c.fechaFin === null) ||
                           finalizingDoc.cargosList?.find((c) => c.nombre === targetCargo);
    if (!targetCargoObj) return;

    try {
      const res = await teachersApi.finalizeCargo(finalizingDoc.id, targetCargoObj.id);
      if (res.ok) {
        const nowStr = hoyISO();
        setDocentes((prev) =>
          prev.map((d) => {
            if (d.id === finalizingDoc.id) {
              const updatedCargos = d.cargosList?.map((c) =>
                c.id === targetCargoObj.id ? { ...c, fechaFin: nowStr, esPrincipal: false } : c
              );
              return {
                ...d,
                cargo: 'Docente de Aula',
                cargosList: updatedCargos,
              };
            }
            return d;
          }),
        );
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al finalizar el cargo.';
        alert(errMsg);
      }
    } catch (err) {
      console.error('Connection error when finalizing cargo:', err);
    } finally {
      setFinalizingDoc(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!deletingDoc) return;
    try {
      const res = await teachersApi.deactivate(deletingDoc.id);
      if (res.ok) {
        setDocentes((prev) =>
          prev.map((d) => (d.id === deletingDoc.id ? { ...d, activo: false } : d)),
        );
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al dar de baja el docente.';
        alert(errMsg);
      }
    } catch (err) {
      console.error('Connection error when deactivating teacher:', err);
    } finally {
      setDeletingDoc(null);
    }
  };

  const confirmRestore = async () => {
    if (!restoringDoc) return;
    try {
      const res = await teachersApi.activate(restoringDoc.id);
      if (res.ok) {
        setDocentes((prev) =>
          prev.map((d) => (d.id === restoringDoc.id ? { ...d, activo: true } : d)),
        );
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al reactivar el docente.';
        alert(errMsg);
      }
    } catch (err) {
      console.error('Connection error when activating teacher:', err);
    } finally {
      setRestoringDoc(null);
    }
  };

  const getCargoStatus = (doc: Docente) => {
    const targetCargoObj = doc.cargosList?.find((c) => c.nombre === targetCargo && c.fechaFin === null) ||
                           doc.cargosList?.find((c) => c.nombre === targetCargo);
    const isCargoFinalized = targetCargoObj ? targetCargoObj.fechaFin !== null : false;
    const isMonitorCargo = ['Director', 'Coordinador Pedagógico', 'Jefe de Taller'].includes(targetCargo);
    return { targetCargoObj, isCargoFinalized, isMonitorCargo };
  };

  return (
    <>
      <EntityTable
        header={
          <>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider pl-5">DNI</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Apellidos y Nombres</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Correo</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Teléfono</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Condición / Escala</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Grado y Sección a cargo</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Estado</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider text-right pr-5">Acciones</TableHead>
          </>
        }
        pagination={pagination}
        emptyMessage={`No se encontraron ${itemName} con los filtros seleccionados.`}
        itemName={itemName}
      >
        {pagination.pageItems.map((doc) => {
          const { isCargoFinalized, isMonitorCargo } = getCargoStatus(doc);
          return (
            <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-semibold pl-5 text-text">{doc.dni}</TableCell>
              <TableCell>
                <div className="font-bold text-text">{doc.apellidos}, {doc.nombres}</div>
              </TableCell>
              <TableCell className="text-text text-sm">{doc.correo}</TableCell>
              <TableCell className="text-text text-sm">{doc.celular}</TableCell>
              <TableCell>
                <div className="text-xs font-medium text-text">{doc.condicion}</div>
                <div className="text-[0.65rem] text-text-muted mt-0.5">Escala: {doc.escala}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(doc.secciones || []).map((sec) => (
                    <Badge key={sec.id} variant="outline" className="text-[0.7rem] py-0.5 px-2.5 font-bold bg-muted/40 text-text border-border">
                      {sec.grado} "{sec.seccion}"
                    </Badge>
                  ))}
                  {(doc.secciones || []).length === 0 && (
                    <span className="text-xs text-text-muted italic">Sin asignar</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {isCargoFinalized ? (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">Cargo Finalizado</Badge>
                ) : (
                  <Badge className={doc.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
                    {doc.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right pr-5">
                <FastActions
                  onView={() => onView(doc)}
                  onEdit={doc.activo && !isCargoFinalized ? () => { onEdit?.(doc); navigate(`${routePrefix}/${doc.id}/editar`); } : undefined}
                  onRestore={!isMonitorCargo && !doc.activo ? () => setRestoringDoc(doc) : undefined}
                  onFinalize={doc.activo && !isCargoFinalized ? () => handleFinalizeClick(doc) : undefined}
                  onAssign={(targetCargo === 'Coordinador Pedagógico' || targetCargo === 'Jefe de Taller') && doc.activo && !isCargoFinalized ? () => setAssigningDoc(doc) : undefined}
                  viewTitle="Ver ficha"
                  restoreTitle="Reactivar docente"
                  finalizeTitle={isMonitorCargo ? `Finalizar Cargo de ${targetCargo}` : 'Desactivar docente'}
                  assignTitle="Asignar Docentes"
                />
              </TableCell>
            </TableRow>
          );
        })}
      </EntityTable>

      {deletingDoc && (
        <ConfirmModal
          danger
          title="¿Desactivar Docente?"
          message={`Esta acción desactivará el registro de ${deletingDoc.apellidos}, ${deletingDoc.nombres} en el padrón oficial.`}
          confirmLabel="Desactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeletingDoc(null)}
        />
      )}

      {restoringDoc && (
        <ConfirmModal
          title="¿Reactivar Personal?"
          message={`Esta acción reactivará el registro de ${restoringDoc.apellidos}, ${restoringDoc.nombres} en el padrón oficial.`}
          confirmLabel="Reactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmRestore}
          onCancel={() => setRestoringDoc(null)}
        />
      )}

      {finalizingDoc && (
        <ConfirmModal
          danger
          title="¿Finalizar Designación de Cargo?"
          message={`Esta acción finalizará la designación de ${targetCargo} para ${finalizingDoc.apellidos}, ${finalizingDoc.nombres}. El usuario retornará al rol de Docente regular y se cancelarán sus monitoreos pendientes.`}
          confirmLabel="Finalizar Cargo"
          cancelLabel="Cancelar"
          onConfirm={confirmFinalizeCargo}
          onCancel={() => setFinalizingDoc(null)}
        />
      )}

      {assigningDoc && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setAssigningDoc(null); }}>
          <AlertDialogContent className="!max-w-5xl !w-[90vw] p-0 overflow-hidden bg-transparent border-0 shadow-none">
             <div className="relative bg-white rounded-xl shadow-xl w-full h-[85vh] flex flex-col overflow-hidden">
               <div className="absolute top-2 right-2 z-10">
                 <button onClick={() => setAssigningDoc(null)} className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer border-none outline-none">
                   <X className="h-4 w-4 text-slate-500" />
                 </button>
               </div>
               <div className="p-4 pt-8 flex-1 overflow-hidden flex flex-col">
                 <AsignacionEvaluadorWidget
                   evaluadorId={assigningDoc.id}
                   evaluadorNombre={`${assigningDoc.nombres} ${assigningDoc.apellidos}`}
                   evaluadorCargo={targetCargo}
                 />
               </div>
             </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
