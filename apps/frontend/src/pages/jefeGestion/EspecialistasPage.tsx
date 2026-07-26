import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { useNavigate } from 'react-router-dom';

import { FilterEspecialistas } from '@features/especialistas';
import { EspecialistasStatsWidget, EspecialistasTableWidget } from '@widgets/especialistas';
import { fetchEspecialistas } from '@features/especialistas/especialista-service';
import type { Especialista } from '@entities/model-especialistas';

// Roles de nivel institucional (docente con cargo de monitor). Tienen un registro
// de especialista SOLO para poder monitorear en su propia IE, pero no son
// especialistas UGEL y no deben aparecer en este padrón.
const ROLES_INSTITUCIONALES = [
  'coordinador_pedagogico',
  'jefe_taller',
  'director_institucion',
  'docente',
];

export const EspecialistasPage = () => {
  const navigate = useNavigate();
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEspecialistas = async () => {
    setLoading(true);
    const mapped = await fetchEspecialistas({ cargo: 'Especialista' });
    const filtered = mapped.filter(
      (esp) =>
        esp.cargo === 'Especialista' && !ROLES_INSTITUCIONALES.includes(esp.rolCode ?? ''),
    );
    setEspecialistas(filtered);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => loadEspecialistas());
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando especialistas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title="Gestión de Especialistas"
        description="Padrón oficial de especialistas de monitoreo pedagógico de la jurisdicción."
        action={
          <Button
            onClick={() => navigate('/especialistas/nuevo')}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary-hover text-white"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Registrar Especialista
          </Button>
        }
      />

      {/* 1. Indicadores de Estado */}
      <EspecialistasStatsWidget especialistas={especialistas} />

      {/* 2. Barra de Filtros */}
      <FilterEspecialistas />

      {/* 3. Tabla de Datos */}
      <EspecialistasTableWidget
        especialistas={especialistas}
        setEspecialistas={setEspecialistas}
        onView={(esp) => navigate(`/especialistas/${esp.id}`)}
      />
    </div>
  );
};
