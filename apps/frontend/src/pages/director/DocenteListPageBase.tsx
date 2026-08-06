import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { useLocation, useNavigate } from 'react-router-dom';

import { FilterDocentes } from '@features/docentes';
import { DocentesStatsWidget, DocentesTableWidget } from '@widgets/docentes';
import { fetchDocentes } from '@features/docentes/docente-service';
import type { Docente } from '@entities/model-docentes';
import type { Institucion } from '@entities/model-instituciones';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

interface DocenteListPageBaseProps {
  title: string;
  description: string;
  actionText: string;
  createPath: string;
  targetCargo: 'Docente de Aula' | 'Coordinador Pedagógico' | 'Jefe de Taller' | 'Director';
  itemName: string;
  loadingLabel: string;
  filterCargoOut?: string;
  /** Si se indica, solo muestra docentes cuya especialidad incluya este valor (ej. 'EPT'). */
  filterEspecialidad?: string;
}

export const DocenteListPageBase = ({
  title,
  description,
  actionText,
  createPath,
  targetCargo,
  itemName,
  loadingLabel,
  filterCargoOut,
  filterEspecialidad,
}: DocenteListPageBaseProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      let docentesMapped = await fetchDocentes();
      if (filterCargoOut) {
        const isDirectorIe = user?.role === RoleCode.DIRECTOR_INSTITUCION;
        if (isDirectorIe) {
          docentesMapped = docentesMapped.filter((d) => d.cargo !== filterCargoOut);
        }
      }
      if (filterEspecialidad) {
        // El Jefe de Taller es solo para docentes de EPT (Educación para el Trabajo).
        // La especialidad puede venir como lista separada por comas.
        const objetivo = filterEspecialidad.toLowerCase();
        docentesMapped = docentesMapped.filter((d) =>
          (d.especialidad ?? '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .includes(objetivo),
        );
      }
      setDocentes(docentesMapped);

      if (user?.institucion && user?.institucionNombre) {
        setInstituciones([
          {
            id: user.institucion,
            nombre: user.institucionNombre,
            codigoModular: '',
            codigoLocal: '',
            direccion: '',
            nivel: user.institucionNivel || 'Secundaria',
            distrito: user.distrito || '',
            provincia: '',
            zona: '',
            modalidad: 'EBR',
            director: `${user.apellidos}, ${user.nombres}`,
            activo: true,
            estado: 'Activa',
          },
        ]);
      }
    } catch (err) {
      console.error(`Connection error loading ${itemName} data:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchAllData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">{loadingLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title={title}
        description={description}
        action={
          <Button
            onClick={() => navigate(createPath, { state: { from: location.pathname } })}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary-hover text-white"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            {actionText}
          </Button>
        }
      />

      {/* 1. Indicadores de Estado */}
      <DocentesStatsWidget docentes={docentes} />

      {/* 2. Barra de Filtros */}
      <FilterDocentes docentes={docentes} />

      {/* 3. Tabla de Datos */}
      <DocentesTableWidget
        docentes={docentes}
        setDocentes={setDocentes}
        instituciones={instituciones}
        targetCargo={targetCargo}
        itemName={itemName}
        routePrefix="/instituciones/docentes"
        onView={(doc) => navigate(`/instituciones/docentes/${doc.id}`, { state: { from: location.pathname } })}
      />
    </div>
  );
};
