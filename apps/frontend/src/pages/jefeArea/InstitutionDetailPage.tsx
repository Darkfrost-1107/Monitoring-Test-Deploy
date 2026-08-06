import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@entities/model-user'; // 🚀 Tu entidad de usuario limpia
import type { Institucion } from '@entities/model-instituciones';
import { Spinner } from '@shared/ui/Spinner';
import { fetchInstitucionById } from '@features/institutions/institution-service';

import { InstitutionProfileWidget } from '@widgets/institutions/ViewInstitution';
import { PlantillasCatalog } from '@widgets/plantillas';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

export const InstitutionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/instituciones/padron';

  const { user } = useUser();

  const [institucion, setInstitucion] = useState<Institucion | null>(null);
  const [loading, setLoading] = useState(true);

  const isReadOnly = user?.role === RoleCode.ESPECIALISTA;

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const inst = await fetchInstitucionById(id);
        setInstitucion(inst);
      } catch (err) {
        console.error('Error fetching details:', err);
        setInstitucion(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando datos de la I.E...</span>
      </div>
    );
  }

  if (!institucion) {
    return (
      <div className="w-full max-w-[820px] mx-auto text-center py-20 bg-surface border border-border rounded-2xl shadow-sm mt-6">
        <h2 className="text-xl font-bold text-text mb-2">Institución no encontrada</h2>
        <p className="text-text-muted mb-6">
          El código identificador {id} no existe o no tiene permisos de acceso.
        </p>
        <button
          onClick={() => navigate(backPath)}
          className="px-5 py-2.5 bg-bg border border-border rounded-xl font-semibold text-text hover:bg-muted transition-colors cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto w-full">
      <InstitutionProfileWidget
        institucion={institucion}
        isReadOnly={isReadOnly}
        onBack={() => navigate(backPath)}
        onEdit={() => navigate(`/instituciones/${id}/editar`, { state: { from: backPath } })}
      />

      {/* Sección de Plantillas de Monitoreo de la I.E. */}
      <div className="mt-8 animate-in fade-in-0 duration-300">
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Plantillas de Monitoreo de la Institución</h2>
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
          <PlantillasCatalog institucionId={institucion.id} />
        </div>
      </div>
    </div>
  );
};
