import { useState } from 'react';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import { useCan } from '@shared/auth/use-can';
import { useUser } from '@entities/model-user';
import { ModalRestablecerContrasena } from '@features/docentes/ui/ModalRestablecerContrasena';
import { FastActions } from '@shared/ui/FastActions';
import type { Docente, CondicionDirectiva } from '@entities/model-docentes';
import { CONDICION_DIRECTIVA_COLOR } from '@entities/model-docentes';
import { useEntityTable } from '@shared/hooks/useEntityTable';
import { useAccionDelPadron } from '@shared/hooks/use-accion-del-padron';
import { AvisoDeError } from '@shared/ui/AvisoDeError';
import { EntityTable } from '@shared/ui/EntityTable';
import { teachersApi } from '@shared/api/teachers.api';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Badge } from '@shared/ui/badge';
import { TableCell, TableHead, TableRow } from '@shared/ui/table';
import { hoyISO } from '@shared/lib/fecha/fecha';
import { directorFilter, subdirectorFilter } from './filtro-directores';

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

/**
 * La designación directiva vigente, o `undefined` si ya fue cesada.
 */
const designacionVigente = (dir: Docente, cargo: string) =>
  dir.cargosList?.find((c) => c.nombre === cargo && c.fechaFin === null);


interface DirectoresTableWidgetProps {
  directores: Docente[];
  setDirectores: React.Dispatch<React.SetStateAction<Docente[]>>;
  instituciones: { id: string; nombre: string }[];
  onView: (director: Docente) => void;
  onEdit?: (director: Docente) => void;
  targetCargo?: 'Director' | 'Subdirector';
}

export const DirectoresTableWidget = ({
  directores,
  setDirectores,
  instituciones,
  onView,
  onEdit,
  targetCargo = 'Director',
}: DirectoresTableWidgetProps) => {
  const { can } = useCan();
  const { user } = useUser();
  const tieneCapacidadRestablecer = can(Capability.PERSONAL_RESTABLECER_CONTRASENA);

  const [finalizing, setFinalizing] = useState<Docente | null>(null);
  const [restoring, setRestoring] = useState<Docente | null>(null);
  const [aRestablecer, setARestablecer] = useState<Docente | null>(null);

  const getInstName = (id: string) =>
    instituciones.find((i) => i.id === id)?.nombre ?? 'I.E. No Asignada';

  const filterFn = (dir: Docente, params: URLSearchParams) =>
    targetCargo === 'Subdirector'
      ? subdirectorFilter(dir, params, getInstName)
      : directorFilter(dir, params, getInstName);

  const pagination = useEntityTable({ data: directores, filterFn });

  const { error, setError, ejecutar } = useAccionDelPadron();

  const confirmFinalize = async () => {
    if (!finalizing) return;
    const id = finalizing.id;

    const designacion = finalizing.cargosList?.find(
      (c) => c.nombre === targetCargo && c.fechaFin === null,
    );

    if (!designacion) {
      setError(`No se encontró la designación vigente de ${targetCargo} para este registro.`);
      setFinalizing(null);
      return;
    }

    const ok = await ejecutar(
      () => teachersApi.finalizeCargo(id, designacion.id),
      `Error al finalizar el cargo de ${targetCargo.toLowerCase()}.`,
      () => setFinalizing(null),
    );
    if (!ok) return;

    const cerradaHoy = hoyISO();
    setDirectores((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              activo: false,
              cargosList: d.cargosList?.map((c) =>
                c.id === designacion.id ? { ...c, fechaFin: cerradaHoy, esPrincipal: false } : c,
              ),
            }
          : d,
      ),
    );
  };

  const confirmRestore = async () => {
    if (!restoring) return;
    const id = restoring.id;

    const ok = await ejecutar(
      () => teachersApi.activate(id),
      `Error al reactivar el ${targetCargo.toLowerCase()}.`,
      () => setRestoring(null),
    );
    if (!ok) return;

    setDirectores((prev) => prev.map((d) => (d.id === id ? { ...d, activo: true } : d)));
  };

  return (
    <>
      <AvisoDeError mensaje={error} onCerrar={() => setError(null)} />

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
        emptyMessage={`No se encontraron ${targetCargo.toLowerCase()}es con los filtros seleccionados.`}
        itemName={`${targetCargo.toLowerCase()}es`}
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
            <TableCell className="text-xs font-medium text-text">
              {designacionVigente(dir, targetCargo) ? `${targetCargo} de ${nivelLabel(dir.nivelEducativo)}` : (dir.cargo || targetCargo)}
            </TableCell>
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
                {dir.escala ? (ESCALA_NUM[dir.escala] ?? dir.escala) : '—'}
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
                  onFinalize={designacionVigente(dir, targetCargo) ? () => setFinalizing(dir) : undefined}
                  onRestore={!dir.activo ? () => setRestoring(dir) : undefined}
                  onResetPassword={
                    tieneCapacidadRestablecer && dir.activo && dir.id !== user?.docenteId
                      ? () => setARestablecer(dir)
                      : undefined
                  }
                  resetPasswordDisabled={Boolean(dir.contrasenaInicial)}
                  resetPasswordDisabledReason="La contraseña ya se encuentra en su valor inicial (DNI)"
                  viewTitle="Ver ficha"
                  restoreTitle={`Reactivar ${targetCargo.toLowerCase()}`}
                  finalizeTitle={`Cesar como ${targetCargo}`}
                />
            </TableCell>
          </TableRow>
        ))}
      </EntityTable>

      {finalizing && (
        <ConfirmModal
          danger
          title={`¿Finalizar Designación de ${targetCargo}?`}
          message={<>Esta acción cesará a <strong>{finalizing.nombres} {finalizing.apellidos}</strong> como {targetCargo}. Saldrá de esta tabla y pasará a figurar como docente de aula, sin institución asignada, y su acceso al sistema será desactivado. Desde el padrón de docentes puede volver a designarlo.</>}
          confirmLabel={`Cesar ${targetCargo}`}
          cancelLabel="Cancelar"
          onConfirm={confirmFinalize}
          onCancel={() => setFinalizing(null)}
        />
      )}

      {restoring && (
        <ConfirmModal
          title={`¿Reactivar ${targetCargo}?`}
          message={`Esta acción reactivará el registro de ${restoring.apellidos}, ${restoring.nombres} en el padrón de ${targetCargo.toLowerCase()}es.`}
          confirmLabel="Reactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmRestore}
          onCancel={() => setRestoring(null)}
        />
      )}

      {aRestablecer && (
        <ModalRestablecerContrasena
          docente={aRestablecer}
          onClose={() => setARestablecer(null)}
          onRestablecida={() =>
            setDirectores((prev) =>
              prev.map((d) => (d.id === aRestablecer.id ? { ...d, contrasenaInicial: true } : d)),
            )
          }
        />
      )}
    </>
  );
};
