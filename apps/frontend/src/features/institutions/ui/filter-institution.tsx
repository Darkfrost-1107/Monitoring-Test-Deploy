import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NIVELES, MODALIDAD_NIVEL_MAP } from '@entities/model-instituciones';
import { FilterSelect } from '@shared/ui/Filter-Select';
import { Card } from '@shared/ui/card';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/** Modalidades educativas, en el orden en que se ofrecen. */
const MODALIDADES = Object.keys(MODALIDAD_NIVEL_MAP);

export const FilterInstitutions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();

  const isJefeArea = user?.role === RoleCode.JEFE_AREA;
  const jefeNivel = user?.especialistaNivel;

  // Niveles que el usuario tiene permitido ver (el jefe de área sólo su nivel).
  const nivelesPermitidos = (() => {
    if (!isJefeArea || !jefeNivel) return NIVELES;
    const list: string[] = [];
    if (jefeNivel === 'Inicial') {
      list.push('Inicial', ...(MODALIDAD_NIVEL_MAP['EBE'] || []));
    } else if (jefeNivel === 'Primaria') {
      list.push('Primaria');
    } else if (jefeNivel === 'Secundaria') {
      list.push(
        'Secundaria',
        ...(MODALIDAD_NIVEL_MAP['EBA'] || []),
        ...(MODALIDAD_NIVEL_MAP['CEPTRO'] || []),
      );
    }
    return list;
  })();

  const modalidad = searchParams.get('modalidad') || '';
  const nivel = searchParams.get('nivel') || '';
  const q = searchParams.get('q') || '';

  // Nivel cascada: los niveles de la modalidad elegida, acotados a los permitidos.
  // Sin modalidad, todos los permitidos.
  const nivelesDisponibles = (() => {
    const base = modalidad ? (MODALIDAD_NIVEL_MAP[modalidad] ?? []) : NIVELES;
    return base.filter((n) => nivelesPermitidos.includes(n));
  })();

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    // Cambiar de modalidad reinicia el nivel: cada modalidad tiene los suyos.
    if (key === 'modalidad') newParams.delete('nivel');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  return (
    <Card className="p-5 border border-border shadow-xs animate-in fade-in-0 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FilterSelect
          label="Modalidad"
          value={modalidad}
          onChange={(v) => updateFilter('modalidad', v)}
          options={MODALIDADES}
          allLabel="Todas las modalidades"
        />
        <FilterSelect
          label="Nivel educativo"
          value={nivel}
          onChange={(v) => updateFilter('nivel', v)}
          options={nivelesDisponibles}
          allLabel="Todos los niveles"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
            Institución
          </label>
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => updateFilter('q', e.target.value)}
              placeholder="Buscar por nombre o código modular..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 text-sm h-10 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>
    </Card>
  );
};
