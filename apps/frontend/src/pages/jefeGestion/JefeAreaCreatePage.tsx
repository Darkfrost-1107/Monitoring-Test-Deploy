import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { AddJefeArea } from '@widgets/jefes-area';

export const JefeAreaCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/jefes-area';

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
            title="Registrar Nuevo Responsable de Nivel"
            description="Complete los datos para dar de alta un nuevo responsable de nivel de la jurisdicción UGEL."
          />
        </div>
      </div>

      <AddJefeArea routePrefix={backPath} />
    </div>
  );
};
