import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { FilterJefesArea } from '@features/jefes-area';
import { JefesStatsWidget, JefesTableWidget } from '@widgets/jefes-area';
import { fetchJefesArea } from '@features/jefes-area/jefe-area-service';
import type { JefeArea } from '@entities/model-jefes-area';

export const JefesAreaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jefes, setJefes] = useState<JefeArea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJefes = async () => {
    setLoading(true);
    try {
      const mapped = await fetchJefesArea();
      const filtered = mapped.filter((esp) => esp.cargo === 'Jefe de Área');
      setJefes(filtered);
    } catch (err) {
      console.error('Error de red al cargar jefes de área:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchJefes());
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando responsables de nivel...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Gestión de Responsables de Nivel"
        description="Padrón oficial de responsables de nivel de la jurisdicción de la UGEL Lampa."
        action={
          <Button
            onClick={() => navigate('/jefes-area/nuevo', { state: { from: location.pathname } })}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary-hover text-white rounded-xl px-4 py-2.5 shadow-xs"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Registrar Responsable de Nivel
          </Button>
        }
      />

      {/* Indicadores de Estado exclusivos para Jefes */}
      <JefesStatsWidget jefes={jefes} />

      {/* Barra de Filtros dedicada */}
      <FilterJefesArea />

      {/* Tabla dedicada con redirección nativa */}
      <JefesTableWidget
        jefes={jefes}
        onView={(jefe) => navigate(`/jefes-area/${jefe.id}`, { state: { from: location.pathname } })}
        onEdit={(jefe) => navigate(`/jefes-area/${jefe.id}/editar`, { state: { from: location.pathname } })}
        onChanged={fetchJefes}
      />
    </div>
  );
};
