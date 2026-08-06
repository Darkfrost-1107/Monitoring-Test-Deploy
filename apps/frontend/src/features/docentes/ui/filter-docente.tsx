import { useSearchParams } from 'react-router-dom';
import { CONDICION_LABORAL } from '@entities/model-docentes';
import { FilterSelect } from '@shared/ui/Filter-Select';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Search } from 'lucide-react';
import { useUser } from '@entities/model-user';
import type { Docente } from '@entities/model-docentes';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

interface FilterDocentesProps {
  docentes: Docente[];
}

export const FilterDocentes = ({ docentes }: FilterDocentesProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();

  const search = searchParams.get('search') || '';
  const condicion = searchParams.get('condicion') || '';
  const seccion = searchParams.get('seccion') || '';

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);

    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const isDirectorIe = user?.role === RoleCode.DIRECTOR_INSTITUCION;
  const currentNivel =
    isDirectorIe && user?.institucionNivel
      ? user.institucionNivel.toUpperCase()
      : searchParams.get('nivelEducativo')?.toUpperCase() || null;

  const filteredDocentes = currentNivel
    ? docentes.filter((d) => d.nivelEducativo?.toUpperCase() === currentNivel)
    : docentes;

  // Obtener secciones únicas ordenadas de los docentes en mocks filtrados por nivel
  const seccionesOptions = Array.from(
    new Set(
      filteredDocentes.flatMap((d) => (d.secciones || []).map((s) => `${s.grado} ${s.seccion}`)),
    ),
  ).sort();

  return (
    <Card className="p-5 border border-border shadow-xs animate-in fade-in-0 duration-300">
      <div className="flex flex-col gap-4">
        {/* Fila de Filtros Select */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Búsqueda por texto */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
              Buscar Docente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por DNI o Nombre..."
                value={search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9 bg-surface border-border text-text text-sm h-9 w-full"
              />
            </div>
          </div>

          <FilterSelect
            label="Condición Laboral"
            value={condicion}
            onChange={(v) => updateFilter('condicion', v)}
            options={[...CONDICION_LABORAL]}
            allLabel="Todas las condiciones"
          />

          <FilterSelect
            label="Grado y Sección"
            value={seccion}
            onChange={(v) => updateFilter('seccion', v)}
            options={seccionesOptions}
            allLabel="Todos los grados/secciones"
          />
        </div>
      </div>
    </Card>
  );
};
