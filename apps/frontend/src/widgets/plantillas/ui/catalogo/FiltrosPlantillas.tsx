import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { SelectField } from '@shared/ui/form-controls';
import {
  TODOS,
  hayFiltroActivo,
  type FiltrosDePlantillas,
} from '@features/plantillas/lib/filtros-plantillas';

/**
 * Barra de filtros del catálogo de plantillas.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Ocupaba setenta y cinco líneas al principio
 * del `return` de `PlantillasCatalog`.
 */

const TIPO_OPTIONS = [
  { value: TODOS, label: 'Todos los tipos' },
  { value: 'Monitoreo Docente', label: 'Monitoreo Docente' },
  { value: 'Monitoreo Directivo', label: 'Monitoreo Directivo' },
];

const ESTADO_OPTIONS = [
  { value: TODOS, label: 'Todos los estados' },
  { value: 'Vigente', label: 'Vigente' },
  { value: 'Borrador', label: 'Borrador' },
  { value: 'Historico', label: 'Histórico' },
];

interface FiltrosPlantillasProps {
  filtros: FiltrosDePlantillas;
  onCambiar: (cambio: Partial<FiltrosDePlantillas>) => void;
  onLimpiar: () => void;
  onRecargar: () => void;
  anios: readonly number[];
  /**
   * El selector de tipo se oculta cuando el listado ya está acotado a un solo
   * tipo posible: dentro de una institución y para el director.
   */
  mostrarTipo: boolean;
}

export const FiltrosPlantillas = ({
  filtros,
  onCambiar,
  onLimpiar,
  onRecargar,
  anios,
  mostrarTipo,
}: FiltrosPlantillasProps) => (
  <Card className="p-4 border border-border bg-surface shadow-sm">
    <div className="flex flex-col md:flex-row md:items-end gap-4">
      <div className="flex-1 space-y-1">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Buscar Plantilla
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por tipo, descripción..."
            value={filtros.texto}
            onChange={(e) => onCambiar({ texto: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all shadow-inner"
          />
        </div>
      </div>

      {mostrarTipo && (
        <div className="w-full md:w-60">
          <SelectField
            label="Tipo de Ficha"
            value={filtros.tipo}
            onChange={(val) => onCambiar({ tipo: val })}
            placeholder="Todos los tipos"
            options={TIPO_OPTIONS}
          />
        </div>
      )}

      <div className="w-full md:w-44">
        <SelectField
          label="Estado"
          value={filtros.estado}
          onChange={(val) => onCambiar({ estado: val })}
          placeholder="Todos los estados"
          options={ESTADO_OPTIONS}
        />
      </div>

      <div className="w-full md:w-36">
        <SelectField
          label="Año Académico"
          value={filtros.anio}
          onChange={(val) => onCambiar({ anio: val })}
          placeholder="Todos los años"
          options={[
            { value: TODOS, label: 'Todos los años' },
            ...anios.map((y) => ({ value: String(y), label: String(y) })),
          ]}
        />
      </div>

      {hayFiltroActivo(filtros) && (
        <Button
          variant="outline"
          onClick={onLimpiar}
          className="text-xs font-semibold text-primary border-slate-200 hover:bg-slate-50 h-10 w-full md:w-auto cursor-pointer"
        >
          Limpiar
        </Button>
      )}

      <Button
        variant="outline"
        onClick={onRecargar}
        className="text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 h-10 w-full md:w-auto cursor-pointer"
        title="Recargar plantillas"
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
        Recargar
      </Button>
    </div>
  </Card>
);
