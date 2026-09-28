import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Search } from 'lucide-react';

export const FilterJefesArea = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const nivel = searchParams.get('nivel') || '';
  const estado = searchParams.get('estado') || '';

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

  return (
    <Card className="p-5 border border-border shadow-xs animate-in fade-in-0 duration-300">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Búsqueda por texto */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
              Buscar Responsable de Nivel
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por DNI, Nombre..."
                value={search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9 bg-surface border-border text-text text-sm h-9 w-full"
              />
            </div>
          </div>

          {/* Selector de Nivel */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
              Nivel Educativo
            </label>
            <Select
              value={nivel || 'todos'}
              onValueChange={(v) => updateFilter('nivel', v === 'todos' ? '' : v)}
            >
              <SelectTrigger className="w-full text-left text-sm bg-surface border-border text-text h-9">
                <SelectValue placeholder="Todos los niveles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los niveles</SelectItem>
                <SelectItem value="INICIAL">Inicial</SelectItem>
                <SelectItem value="PRIMARIA">Primaria</SelectItem>
                <SelectItem value="SECUNDARIA">Secundaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Estado */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
              Estado
            </label>
            <Select
              value={estado || 'todos'}
              onValueChange={(v) => updateFilter('estado', v === 'todos' ? '' : v)}
            >
              <SelectTrigger className="w-full text-left text-sm bg-surface border-border text-text h-9">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
};
