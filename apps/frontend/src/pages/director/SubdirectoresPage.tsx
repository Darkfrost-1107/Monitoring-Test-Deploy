import { useState, useEffect } from 'react';
import { PlusCircle, UserPlus } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { useLocation, useNavigate } from 'react-router-dom';

import { FilterDirectores } from '@features/directores';
import { DirectoresStatsWidget, DirectoresTableWidget } from '@widgets/directores';
import { fetchDocentes } from '@features/docentes/docente-service';
import { fetchInstituciones } from '@features/institutions/institution-service';
import { PAGINATION } from '@shared/config/constants';
import type { Docente } from '@entities/model-docentes';
import type { Institucion } from '@entities/model-instituciones';
import { tieneElCargo } from '@features/docentes/lib/padron-docentes';

export const SubdirectoresPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [subdirectores, setSubdirectores] = useState<Docente[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [docentesMapped, instMapped] = await Promise.all([
        fetchDocentes(),
        fetchInstituciones({ limit: PAGINATION.MAX_LIMIT }),
      ]);
      setSubdirectores(docentesMapped);
      setInstituciones(instMapped);
    } catch (err) {
      console.error('Connection error loading subdirectores data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchAllData());
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando subdirectores...</span>
      </div>
    );
  }

  // Solo los subdirectores (con cargo activo o vigencia de Subdirector) para los indicadores
  const soloSubdirectores = subdirectores.filter((d) => tieneElCargo(d, 'Subdirector'));

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title="Gestión de Subdirectores"
        description="Administración y asignación de Subdirectores de las instituciones educativas."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate('/instituciones/subdirectores/registrar', {
                  state: { from: location.pathname },
                })
              }
              className="flex items-center gap-2 font-bold cursor-pointer"
            >
              <UserPlus className="w-[18px] h-[18px]" strokeWidth={2} />
              Registrar nuevo
            </Button>
            <Button
              onClick={() =>
                navigate('/instituciones/subdirectores/nuevo', {
                  state: { from: location.pathname },
                })
              }
              className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary-hover text-white"
            >
              <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
              Asignar Subdirector
            </Button>
          </div>
        }
      />

      {/* 1. Indicadores */}
      <DirectoresStatsWidget directores={soloSubdirectores} titlePrefix="Subdirectores" />

      {/* 2. Barra de filtros */}
      <FilterDirectores />

      {/* 3. Tabla de subdirectores con I.E. */}
      <DirectoresTableWidget
        directores={subdirectores}
        setDirectores={setSubdirectores}
        instituciones={instituciones}
        targetCargo="Subdirector"
        onView={(sub) =>
          navigate(`/instituciones/subdirectores/${sub.id}`, { state: { from: location.pathname } })
        }
        onEdit={(sub) =>
          navigate(`/instituciones/subdirectores/${sub.id}/editar`, {
            state: { from: location.pathname },
          })
        }
      />
    </div>
  );
};
