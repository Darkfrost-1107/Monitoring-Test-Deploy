import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstitutionFormBase,
  type InstitutionRawInput,
} from '@features/institutions/ui/CreateInstitutionFormBase';
import { type Institucion } from '@entities/model-instituciones';
import {
  useInstitutionService,
  mapApiInstitucionToFrontend,
} from '@features/institutions/institution-service';
import { institutionsApi } from '@shared/api/institutions.api';
import { Card } from '@shared/ui/card';
import { Spinner } from '@shared/ui/Spinner';

interface EditInstitutionCardProps {
  routePrefix?: string;
}

export const EditInstitutionCard = ({ routePrefix = '/instituciones/padron' }: EditInstitutionCardProps = {}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateInstitution, loading, error } = useInstitutionService();

  const [institucion, setInstitucion] = useState<Institucion | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchInstitution = async () => {
      if (!id) return;
      setFetching(true);
      try {
        const res = await institutionsApi.findById(id);
        if (res.ok && res.data) {
          setInstitucion(mapApiInstitucionToFrontend(res.data));
        } else {
          setInstitucion(null);
        }
      } catch (err) {
        console.error('Error fetching institution for edit:', err);
        setInstitucion(null);
      } finally {
        setFetching(false);
      }
    };
    fetchInstitution();
  }, [id]);

  if (fetching) {
    return (
      <div className="w-full h-[30vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">
          Cargando datos de la institución...
        </span>
      </div>
    );
  }

  if (!institucion) {
    return (
      <div className="p-6 text-center text-text-muted font-medium bg-surface border border-border rounded-2xl">
        No se encontró la institución especificada.
      </div>
    );
  }

  const initialData: InstitutionRawInput = {
    codigoModular: institucion.codigoModular,
    codigoLocal: institucion.codigoLocal || '',
    nombre: institucion.nombre,
    nivel: institucion.nivel,
    provincia: institucion.provincia || '',
    distrito: institucion.distrito,
    zona: institucion.zona || '',
    direccion: institucion.direccion,
    modalidad: institucion.modalidad || 'EBR',
  };

  const handleFormSubmit = async (formData: InstitutionRawInput) => {
    if (!id) return;
    const result = await updateInstitution(id, formData);
    if (result.success) {
      toast.success('Datos de la institución actualizados correctamente');
      navigate(routePrefix);
    }
  };

  return (
    <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-medium mb-5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <InstitutionFormBase
        initialData={initialData}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(routePrefix)}
        isLoading={loading}
      />
    </Card>
  );
};
