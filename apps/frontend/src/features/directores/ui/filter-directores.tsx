import { useSearchParams } from 'react-router-dom';
import { CONDICION_DIRECTIVA } from '@entities/model-docentes';
import { NIVELES, MODALIDAD_NIVEL_MAP } from '@entities/model-instituciones';
import { FilterSelect } from '@shared/ui/Filter-Select';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Search } from 'lucide-react';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

export const FilterDirectores = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();

  const isJefeArea = user?.role === RoleCode.JEFE_AREA;
  const jefeNivel = user?.especialistaNivel;

  const allowedNiveles = (() => {
    if (!isJefeArea || !jefeNivel) {
      return NIVELES;
    }
    const list: string[] = [];
    if (jefeNivel === 'Inicial') {
      list.push('Inicial');
      list.push(...(MODALIDAD_NIVEL_MAP['EBE'] || []));
    } else if (jefeNivel === 'Primaria') {
      list.push('Primaria');
    } else if (jefeNivel === 'Secundaria') {
      list.push('Secundaria');
      list.push(...(MODALIDAD_NIVEL_MAP['EBA'] || []));
      list.push(...(MODALIDAD_NIVEL_MAP['CEPTRO'] || []));
    }
    return list;
  })();

  const search = searchParams.get('search') || '';
  const condicion = searchParams.get('condicion') || '';
  const modalidad = searchParams.get('modalidad') || '';
  const nivelEducativo = searchParams.get('nivelEducativo') || '';

  /**
   * Los niveles que ofrece el selector.
   *
   * Sin modalidad elegida se acumulaban todos en una sola lista —Inicial y
   * Primaria de EBR junto a CEBE, PRITE, «Peluquería y barbería»— y encontrar
   * uno era leer catorce opciones de cuatro modalidades distintas. Elegir la
   * modalidad primero deja sólo sus niveles.
   */
  const nivelesDeLaModalidad = modalidad
    ? (MODALIDAD_NIVEL_MAP[modalidad] ?? []).filter((n) => allowedNiveles.includes(n))
    : allowedNiveles;

  /**
   * Cambiar de modalidad limpia el nivel.
   *
   * Un nivel de EBE no existe dentro de EBR: conservarlo dejaría la tabla vacía
   * con dos filtros que se contradicen y ninguna pista de por qué.
   */
  const cambiarModalidad = (valor: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (valor) newParams.set('modalidad', valor);
    else newParams.delete('modalidad');
    newParams.delete('nivelEducativo');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
            Buscar Director
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por DNI o Apellidos..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9 bg-surface border-border text-text text-sm h-9 w-full"
            />
          </div>
        </div>

        <FilterSelect
          label="Condición"
          value={condicion}
          onChange={(v) => updateFilter('condicion', v)}
          options={[...CONDICION_DIRECTIVA]}
          allLabel="Todas las condiciones"
        />

        <FilterSelect
          label="Modalidad"
          value={modalidad}
          onChange={cambiarModalidad}
          options={Object.keys(MODALIDAD_NIVEL_MAP)}
          allLabel="Todas las modalidades"
        />

        <FilterSelect
          label="Nivel Educativo"
          value={nivelEducativo}
          onChange={(v) => updateFilter('nivelEducativo', v)}
          options={nivelesDeLaModalidad}
          allLabel="Todos los niveles"
        />
      </div>
    </Card>
  );
};
