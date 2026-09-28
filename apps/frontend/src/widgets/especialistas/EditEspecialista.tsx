import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EspecialistaFormBase } from '@features/especialistas';
import { type Especialista } from '@entities/model-especialistas';
import {
  useEspecialistaService,
  mapApiEspecialistaToFrontend,
} from '@features/especialistas/especialista-service';
import { especialistasApi } from '@shared/api/especialistas.api';
import { Card } from '@shared/ui/card';
import { Spinner } from '@shared/ui/Spinner';
import type { EspecialistaFormData } from '@entities/model-especialistas/validator';

export const EditEspecialistaCard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateEspecialista, loading, error } = useEspecialistaService();

  const [especialista, setEspecialista] = useState<Especialista | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchEspecialista = async () => {
      if (!id) return;
      setFetching(true);
      try {
        const res = await especialistasApi.findById(id);
        if (res.ok && res.data) {
          setEspecialista(mapApiEspecialistaToFrontend(res.data));
        } else {
          setEspecialista(null);
        }
      } catch (err) {
        console.error('Error fetching specialist for edit:', err);
        setEspecialista(null);
      } finally {
        setFetching(false);
      }
    };
    fetchEspecialista();
  }, [id]);

  if (fetching) {
    return (
      <div className="w-full h-[30vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">
          Cargando datos del especialista...
        </span>
      </div>
    );
  }

  if (!especialista) {
    return (
      <div className="p-6 text-center text-text-muted font-medium bg-surface border border-border rounded-2xl">
        No se encontró el registro de especialista especificado.
      </div>
    );
  }

  const initialData: EspecialistaFormData = {
    nombres: especialista.nombres,
    apellidos: especialista.apellidos,
    dni: especialista.dni,
    correo: especialista.correo,
    celular: especialista.celular,
    especialidades: especialista.especialidades || undefined,
    especialidad: especialista.especialidad || undefined,
    especialidadesExtras: especialista.especialidadesExtras || undefined,
    nivelEducativo: especialista.nivelEducativo,
    modalidad: (especialista.modalidad as EspecialistaFormData['modalidad']) || 'EBR',
    cargo: (especialista.cargo as EspecialistaFormData['cargo']) || 'Especialista',
    activo: especialista.activo,
    condicionLaboral: especialista.condicionLaboral as EspecialistaFormData['condicionLaboral'],
    cargaLaboral: especialista.cargaLaboral,
    escalaMagisterial: especialista.escalaMagisterial || undefined,
  };

  const handleFormSubmit = async (formData: EspecialistaFormData) => {
    if (!id) return;
    const result = await updateEspecialista(
      id,
      formData,
      especialista.rolCode || 'especialista',
      especialista.cargo || 'Especialista',
    );
    if (result.success) {
      toast.success('Datos del especialista actualizados correctamente');
      navigate('/especialistas');
    }
  };

  return (
    <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <EspecialistaFormBase
        initialData={initialData}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate('/especialistas')}
        isLoading={loading}
      />
    </Card>
  );
};
