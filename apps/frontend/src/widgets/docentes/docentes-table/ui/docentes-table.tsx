import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import type { Docente } from '@entities/model-docentes';
import { useEntityTable } from '@shared/hooks/useEntityTable';
import { EntityTable } from '@shared/ui/EntityTable';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { TableHead } from '@shared/ui/table';
import { teachersApi } from '@shared/api/teachers.api';
import { hoyISO } from '@shared/lib/fecha/fecha';
import {
  cargoFinalizado,
  cargoVigente,
  esCargoDeMonitoreo,
  filtroDelPadron,
} from '@features/docentes/lib/padron-docentes';
import { FilaDeDocente } from './FilaDeDocente';
import { ModalAsignarEvaluados } from './ModalAsignarEvaluados';

/**
 * Padrón de docentes, reutilizado por las seis pantallas de personal.
 *
 * Eran 303 líneas con el filtro adentro y sin cobertura, tres `alert()` del
 * navegador para los errores del servidor y el diálogo de asignación desnudo al
 * final del archivo.
 */

const COLUMNAS = [
  'DNI',
  'Apellidos y Nombres',
  'Correo',
  'Teléfono',
  'Condición / Escala',
  'Grado y Sección a cargo',
  'Estado',
];

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

  const [aDesactivar, setADesactivar] = useState<Docente | null>(null);
  const [aReactivar, setAReactivar] = useState<Docente | null>(null);
  const [aFinalizar, setAFinalizar] = useState<Docente | null>(null);
  const [aAsignar, setAAsignar] = useState<Docente | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtro = useMemo(() => filtroDelPadron(targetCargo), [targetCargo]);
  const pagination = useEntityTable({ data: docentes, filterFn: filtro });

  // El cargo se finaliza o el docente se desactiva según de qué listado se
  // trate; no depende de la fila.
  const esDesignacion = esCargoDeMonitoreo(targetCargo);

  /** Ejecuta la acción y deja el mensaje del servidor a la vista si falla. */
  const ejecutar = async (
    accion: () => Promise<{ ok: boolean; error?: unknown }>,
    alFallar: string,
    alTerminar: () => void,
  ) => {
    setError(null);
    try {
      const respuesta = await accion();
      if (respuesta.ok) return true;
      setError((respuesta.error as { message?: string })?.message || alFallar);
    } catch (err) {
      setError('No se pudo conectar con el servidor. Intente nuevamente en unos momentos.');
      console.error(alFallar, err);
    } finally {
      alTerminar();
    }
    return false;
  };

  const confirmarFinalizacion = async () => {
    if (!aFinalizar) return;

    const designacion = cargoVigente(aFinalizar, targetCargo);
    if (!designacion) {
      setError(`No se encontró la designación de ${targetCargo} para este docente.`);
      setAFinalizar(null);
      return;
    }

    const docenteId = aFinalizar.id;
    const ok = await ejecutar(
      () => teachersApi.finalizeCargo(docenteId, designacion.id),
      'Error al finalizar el cargo.',
      () => setAFinalizar(null),
    );
    if (!ok) return;

    const cerradaHoy = hoyISO();
    setDocentes((previos) =>
      previos.map((d) =>
        d.id === docenteId
          ? {
              ...d,
              cargo: 'Docente de Aula',
              cargosList: d.cargosList?.map((c) =>
                c.id === designacion.id ? { ...c, fechaFin: cerradaHoy, esPrincipal: false } : c,
              ),
            }
          : d,
      ),
    );
  };

  const confirmarDesactivacion = async () => {
    if (!aDesactivar) return;
    const id = aDesactivar.id;

    const ok = await ejecutar(
      () => teachersApi.deactivate(id),
      'Error al dar de baja el docente.',
      () => setADesactivar(null),
    );
    if (!ok) return;

    setDocentes((previos) => previos.map((d) => (d.id === id ? { ...d, activo: false } : d)));
  };

  const confirmarReactivacion = async () => {
    if (!aReactivar) return;
    const id = aReactivar.id;

    const ok = await ejecutar(
      () => teachersApi.activate(id),
      'Error al reactivar el docente.',
      () => setAReactivar(null),
    );
    if (!ok) return;

    setDocentes((previos) => previos.map((d) => (d.id === id ? { ...d, activo: true } : d)));
  };

  return (
    <>
      {/* Antes cada uno de estos errores era un `alert()`: bloqueaba la pestaña
          y desaparecía sin dejar rastro al aceptarlo. */}
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-bold underline cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      <EntityTable
        header={
          <>
            {COLUMNAS.map((columna, indice) => (
              <TableHead
                key={columna}
                className={`font-bold text-[0.7rem] uppercase tracking-wider ${
                  indice === 0 ? 'pl-5' : ''
                }`}
              >
                {columna}
              </TableHead>
            ))}
            <TableHead className="font-bold text-[0.7rem] uppercase tracking-wider text-right pr-5">
              Acciones
            </TableHead>
          </>
        }
        pagination={pagination}
        emptyMessage={`No se encontraron ${itemName} con los filtros seleccionados.`}
        itemName={itemName}
      >
        {pagination.pageItems.map((docente) => {
          const finalizado = cargoFinalizado(docente, targetCargo);
          const editable = docente.activo && !finalizado;

          return (
            <FilaDeDocente
              key={docente.id}
              docente={docente}
              cargoFinalizado={finalizado}
              acciones={{
                onVer: () => onView(docente),
                onEditar: editable
                  ? () => {
                      onEdit?.(docente);
                      navigate(`${routePrefix}/${docente.id}/editar`);
                    }
                  : undefined,
                onReactivar:
                  !esDesignacion && !docente.activo ? () => setAReactivar(docente) : undefined,
                onFinalizar: editable
                  ? () => (esDesignacion ? setAFinalizar(docente) : setADesactivar(docente))
                  : undefined,
                onAsignar:
                  editable &&
                  (targetCargo === 'Coordinador Pedagógico' || targetCargo === 'Jefe de Taller')
                    ? () => setAAsignar(docente)
                    : undefined,
                rotuloFinalizar: esDesignacion
                  ? `Finalizar Cargo de ${targetCargo}`
                  : 'Desactivar docente',
              }}
            />
          );
        })}
      </EntityTable>

      {aDesactivar && (
        <ConfirmModal
          danger
          title="¿Desactivar Docente?"
          message={`Esta acción desactivará el registro de ${aDesactivar.apellidos}, ${aDesactivar.nombres} en el padrón oficial.`}
          confirmLabel="Desactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmarDesactivacion}
          onCancel={() => setADesactivar(null)}
        />
      )}

      {aReactivar && (
        <ConfirmModal
          title="¿Reactivar Personal?"
          message={`Esta acción reactivará el registro de ${aReactivar.apellidos}, ${aReactivar.nombres} en el padrón oficial.`}
          confirmLabel="Reactivar"
          cancelLabel="Cancelar"
          onConfirm={confirmarReactivacion}
          onCancel={() => setAReactivar(null)}
        />
      )}

      {aFinalizar && (
        <ConfirmModal
          danger
          title="¿Finalizar Designación de Cargo?"
          message={`Esta acción finalizará la designación de ${targetCargo} para ${aFinalizar.apellidos}, ${aFinalizar.nombres}. El usuario retornará al rol de Docente regular y se cancelarán sus monitoreos pendientes.`}
          confirmLabel="Finalizar Cargo"
          cancelLabel="Cancelar"
          onConfirm={confirmarFinalizacion}
          onCancel={() => setAFinalizar(null)}
        />
      )}

      {aAsignar && (
        <ModalAsignarEvaluados
          evaluadorId={aAsignar.id}
          evaluadorNombre={`${aAsignar.nombres} ${aAsignar.apellidos}`}
          evaluadorCargo={targetCargo}
          onCerrar={() => setAAsignar(null)}
        />
      )}
    </>
  );
};
