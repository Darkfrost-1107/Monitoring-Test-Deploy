import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { EditJefeArea } from '@widgets/jefes-area';

export const JefeAreaEditPage = () => {
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
            title="Modificar Datos de Responsable de Nivel"
            description="Actualice el perfil profesional o de contacto del responsable de nivel seleccionado."
          />
        </div>
      </div>

      <EditJefeArea routePrefix={backPath} />
    </div>
  );
};
