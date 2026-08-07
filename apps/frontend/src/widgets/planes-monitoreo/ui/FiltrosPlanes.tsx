import { Search, Compass, LayoutGrid, List } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { TextField, SelectField } from '@shared/ui/form-controls';
import type { FiltrosDePlanes, ModoDeVista } from '@features/planes-monitoreo/lib/vista-planes';

/**
 * Filtros, selector de vista y estados vacíos del repositorio de planes.
 *
 * Fase 7 de PLAN_REMEDIACION.md.
 */

interface FiltrosPlanesProps {
  filtros: FiltrosDePlanes;
  onCambiar: (cambio: Partial<FiltrosDePlanes>) => void;
  opcionesAnio: { value: string; label: string }[];
}

export const FiltrosPlanes = ({ filtros, onCambiar, opcionesAnio }: FiltrosPlanesProps) => (
  <Card className="border border-border bg-surface shadow-sm rounded-2xl p-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <TextField
        label="Buscar por Título"
        value={filtros.busqueda}
        onChange={(v) => onCambiar({ busqueda: v })}
        placeholder="Ej. Plan Anual 2024..."
        adornment={<Search className="w-[18px] h-[18px] text-text-muted" />}
      />
      <SelectField
        label="Año Académico"
        value={filtros.anio}
        onChange={(v) => onCambiar({ anio: v })}
        placeholder="Seleccionar año..."
        options={[{ value: 'Todos', label: 'Todos' }, ...opcionesAnio]}
      />
      <SelectField
        label="Estado"
        value={filtros.estado}
        onChange={(v) => onCambiar({ estado: v })}
        placeholder="Seleccionar estado..."
        options={[
          { value: 'Todos', label: 'Todos' },
          { value: 'Activo', label: 'Activo' },
          { value: 'Inactivo', label: 'Inactivo' },
        ]}
      />
    </div>
  </Card>
);

export const SelectorDeVista = ({
  modo,
  onCambiar,
}: {
  modo: ModoDeVista;
  onCambiar: (modo: ModoDeVista) => void;
}) => {
  const clase = (propio: ModoDeVista) =>
    `p-1.5 rounded-lg transition-all cursor-pointer ${
      modo === propio ? 'bg-surface text-primary shadow-xs' : 'text-text-muted hover:text-text'
    }`;

  return (
    <div className="flex items-center justify-between mb-3.5">
      <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
        Documentos de Monitoreo
      </span>
      <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80 gap-0.5">
        <button
          type="button"
          onClick={() => onCambiar('grid')}
          className={clase('grid')}
          title="Vista Cuadrícula"
        >
          <LayoutGrid className="w-[15px] h-[15px]" />
        </button>
        <button
          type="button"
          onClick={() => onCambiar('list')}
          className={clase('list')}
          title="Vista Lista"
        >
          <List className="w-[15px] h-[15px]" />
        </button>
      </div>
    </div>
  );
};

export const CargandoPlanes = () => (
  <div className="w-full h-[350px] flex flex-col justify-center items-center gap-3">
    <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary" />
    <span className="text-text-muted text-sm font-medium">Cargando planes de monitoreo...</span>
  </div>
);

export const SinPlanes = () => (
  <Card className="border border-dashed border-border py-16 flex flex-col justify-center items-center gap-3 text-center bg-surface/50 rounded-2xl">
    <div className="w-14 h-14 bg-muted/60 text-text-muted/60 rounded-full flex items-center justify-center">
      <Compass className="w-8 h-8" strokeWidth={1.5} />
    </div>
    <h3 className="text-sm font-bold text-text">No se encontraron planes</h3>
    <p className="text-xs text-text-muted max-w-sm px-4">
      No hay ningún documento de monitoreo que coincida con los criterios de búsqueda o filtros
      actuales.
    </p>
  </Card>
);
