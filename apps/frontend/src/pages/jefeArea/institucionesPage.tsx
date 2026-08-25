import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PAGINATION } from '@shared/config/constants';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { FilterInstitutions } from '@features/institutions/ui/filter-institution';
import { InstitutionsStatsWidget } from '@/widgets/institutions/institutions-stats';
import { InstitutionsTableWidget } from '@/widgets/institutions/institutions-table/ui/institution-table';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchInstituciones } from '@features/institutions/institution-service';
import type { Institucion } from '@entities/model-instituciones';

export const InstitucionesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstituciones = async () => {
    setLoading(true);
    const mapped = await fetchInstituciones({ limit: PAGINATION.MAX_LIMIT });
    setInstituciones(mapped);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => loadInstituciones());
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando instituciones...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title="Gestión de Instituciones"
        description="Administración del padrón oficial de II.EE."
        action={
          <Button
            onClick={() => navigate('/instituciones/nuevo', { state: { from: location.pathname } })}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary-hover text-white"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Nueva Institución
          </Button>
        }
      />

      {/* 1. Indicadores de Estado */}
      <InstitutionsStatsWidget instituciones={instituciones} />

      {/* 2. Barra de Filtros (Controlador de la URL) */}
      <FilterInstitutions />

      <InstitutionsTableWidget
        instituciones={instituciones}
        setInstituciones={setInstituciones}
        onEdit={(inst) => navigate(`/instituciones/${inst.id}/editar`, { state: { from: location.pathname } })}
        onView={(inst) => navigate(`/instituciones/${inst.id}`, { state: { from: location.pathname } })}
      />
    </div>
  );
};
