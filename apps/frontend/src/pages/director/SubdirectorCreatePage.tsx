import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PAGINATION } from '@shared/config/constants';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { CreateDocenteCard } from '@widgets/docentes';
import { fetchInstituciones } from '@features/institutions/institution-service';
import type { Institucion } from '@entities/model-instituciones';

export const SubdirectorCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/instituciones/subdirectores';

  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIes = async () => {
      setLoading(true);
      const mapped = await fetchInstituciones({ limit: PAGINATION.MAX_LIMIT });
      setInstituciones(mapped);
      setLoading(false);
    };
    void fetchIes();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando formulario...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[820px] mx-auto w-full animate-in fade-in-0 duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(backPath)}
          className="p-2.5 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <PageHeader
            title="Registrar Nuevo Subdirector"
            description="Complete los datos para dar de alta a un subdirector en la institución educativa."
          />
        </div>
      </div>

      <CreateDocenteCard
        instituciones={instituciones}
        targetCargo="Subdirector"
        routePrefix={backPath}
        submitLabel="Guardar Subdirector"
      />
    </div>
  );
};
