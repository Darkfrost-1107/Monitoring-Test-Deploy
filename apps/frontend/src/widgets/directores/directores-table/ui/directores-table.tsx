import { useState } from 'react';
import { FastActions } from '@shared/ui/FastActions';
import type { Docente, CondicionDirectiva } from '@entities/model-docentes';
import { CONDICION_DIRECTIVA_COLOR } from '@entities/model-docentes';
import { useEntityTable } from '@shared/hooks/useEntityTable';
import { EntityTable } from '@shared/ui/EntityTable';
import { teachersApi } from '@shared/api/teachers.api';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Badge } from '@shared/ui/badge';
import { TableCell, TableHead, TableRow } from '@shared/ui/table';
import { hoyISO } from '@shared/lib/fecha/fecha';

// Escala magisterial romana → número con cero (V → "05"), como en el mockup.
const ESCALA_NUM: Record<string, string> = {
  I: '01',
  II: '02',
  III: '03',
  IV: '04',
  V: '05',
  VI: '06',
  VII: '07',
  VIII: '08',
};

// PRIMARIA → Primaria
const nivelLabel = (nivel: string) => nivel.charAt(0) + nivel.slice(1).toLowerCase();

const directorFilter = (dir: Docente, params: URLSearchParams) => {
  const hasCargo = dir.cargosList?.some((c) => c.nombre === 'Director') ?? (dir.cargo === 'Director');
  if (!hasCargo) return false;

  const searchQuery = params.get('search') || '';
  const matchSearch =
    !searchQuery ||
    dir.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dir.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dir.dni.includes(searchQuery);

  const condicion = params.get('condicion') || '';
  const matchCondicion =
    !condicion || (dir.condicion ?? '').toLowerCase() === condicion.toLowerCase();

  const nivel = params.get('nivelEducativo') || '';
  const matchNivel =
    !nivel || (dir.nivelEducativo ?? '').toLowerCase() === nivel.toLowerCase();

  return matchSearch && matchCondicion && matchNivel;
};

interface DirectoresTableWidgetProps {
  directores: Docente[];
  setDirectores: React.Dispatch<React.SetStateAction<Docente[]>>;
  instituciones: { id: string; nombre: string }[];
  onView: (director: Docente) => void;
  onEdit?: (director: Docente) => void;
}

export const DirectoresTableWidget = ({
  directores,
  setDirectores,
  instituciones,
  onView,
  onEdit,
}: DirectoresTableWidgetProps) => {
  const [finalizing, setFinalizing] = useState<Docente | null>(null);
  const [restoring, setRestoring] = useState<Docente | null>(null);

  const pagination = useEntityTable({ data: directores, filterFn: directorFilter });

  const getInstName = (id: string) =>
    instituciones.find((i) => i.id === id)?.nombre ?? 'I.E. No Asignada';

  const confirmFinalize = async () => {
    if (!finalizing) return;
    const targetCargo = finalizing.cargosList?.find((c) => c.nombre === 'Director' && c.fechaFin === null);
    if (!targetCargo) return;

    try {
      const res = await teachersApi.finalizeCargo(finalizing.id, targetCargo.id);
      if (res.ok) {
        const nowStr = hoyISO();
        setDirectores((prev) =>
          prev.map((d) => {
            if (d.id === finalizing.id) {
              const updatedCargos = d.cargosList?.map((c) =>
                c.id === targetCargo.id ? { ...c, fechaFin: nowStr, esPrincipal: false } : c
              );
              return { ...d, activo: false, cargosList: updatedCargos };
            }
            return d;
          }),
        );
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al finalizar el cargo de director.';
        alert(errMsg);
      }
    } catch (err) {
      console.error('Connection error when finalizing director:', err);
    } finally {
      setFinalizing(null);
    }
  };

  const confirmRestore = async () => {
    if (!restoring) return;
    try {
      const res = await teachersApi.activate(restoring.id);
      if (res.ok) {
        setDirectores((prev) =>
          prev.map((d) => (d.id === restoring.id ? { ...d, activo: true } : d)),
        );
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al reactivar el director.';
        alert(errMsg);
      }
    } catch (err) {
      console.error('Connection error when activating director:', err);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <>
      <EntityTable
        header={
          <>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider pl-5">Nombres y Apellidos</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">DNI</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Cargo</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Institución Educativa</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Condición</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Escala</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider">Estado</TableHead>
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider text-right pr-5">Acciones</TableHead>
          </>
        }
        pagination={pagination}
        emptyMessage="No se encontraron directores con los filtros seleccionados."
        itemName="directores"
      >
        {pagination.pageItems.map((dir) => (
          <TableRow key={dir.id} className="hover:bg-muted/30 transition-colors">
            <TableCell className="pl-5">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {dir.nombres[0]}{dir.apellidos[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-bold text-text text-sm truncate">{dir.apellidos}, {dir.nombres}</div>
                  <div className="text-xs text-text-muted truncate">{dir.correo} | Cel: {dir.celular}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="font-semibold text-text">{dir.dni}</TableCell>
            <TableCell className="text-xs font-medium text-text">Director de {nivelLabel(dir.nivelEducativo)}</TableCell>
            <TableCell className="text-xs font-medium text-text">{getInstName(dir.institucionId)}</TableCell>
            <TableCell>
              <Badge
                className="text-[0.65rem] py-0.5 px-2.5 uppercase font-bold border-0 text-white"
                style={{ backgroundColor: CONDICION_DIRECTIVA_COLOR[dir.condicion as CondicionDirectiva] ?? '#6b7280' }}
              >
                {dir.condicion}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs font-bold px-2.5">
                {ESCALA_NUM[dir.escala] ?? dir.escala}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={dir.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
                {dir.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
            <TableCell className="text-right pr-5">
                <FastActions
                  onView={() => onView(dir)}
                  onEdit={dir.activo && onEdit ? () => onEdit(dir) : undefined}
                  onFinalize={dir.activo ? () => setFinalizing(dir) : undefined}
                  onRestore={!dir.activo ? () => setRestoring(dir) : undefined}
                  viewTitle="Ver ficha"
                  restoreTitle="Reactivar director"
                  finalizeTitle="Cesar como Director"
                />
            </TableCell>
          </TableRow>
        ))}
      </EntityTable>

      {finalizing && (
        <ConfirmModal
          danger
          title="¿Finalizar Designación de Director?"
          message={<>Esta acción cesará a <strong>{finalizing.nombres} {finalizing.apellidos}</strong> como Director. La persona pasará a figurar como docente sin institución asignada y su acceso al sistema será desactivado. Puede reactivarse posteriormente.</>}
          confirmLabel="Cesar Director"
          cancelLabel="Cancelar"
          onConfirm={confirmFinalize}
          onCancel={() => setFinalizing(null)}
        />
      )}

      {restoring && (
        <ConfirmModal
          title="¿Reactivar Director?"
          message={`Esta acción reactivará el registro de ${restoring.apellidos}, ${restoring.nombres} en el padrón de directores.`}
          confirmLabel="Reactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmRestore}
          onCancel={() => setRestoring(null)}
        />
      )}
    </>
  );
};
