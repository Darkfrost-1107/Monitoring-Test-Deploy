import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DocenteFormBase } from '@features/docentes';
import { useDocenteService } from '@features/docentes';
import { Card } from '@shared/ui/card';
import type { DocenteFormData } from '@entities/model-docentes/validator';

interface Props {
  instituciones: { id: string; nombre: string }[];
  targetCargo?: 'Director' | 'Coordinador Pedagógico' | 'Jefe de Taller' | 'Docente de Aula';
  routePrefix?: string;
  submitLabel?: string;
}

export const CreateDocenteCard = ({
  instituciones,
  targetCargo = 'Director',
  routePrefix = '/instituciones/docentes',
  submitLabel,
}: Props) => {
  const navigate = useNavigate();
  const { createDocente, loading, error } = useDocenteService();

  const handleFormSubmit = async (formData: DocenteFormData) => {
    const result = await createDocente(formData);
    if (result.success) {
      toast.success('Registro creado correctamente');
      navigate(routePrefix);
    }
  };

  const esErrorCelular = error?.toLowerCase().includes('celular') || error?.toLowerCase().includes('teléfono');

  return (
    <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
      {error && !esErrorCelular && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <DocenteFormBase
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(routePrefix)}
        isLoading={loading}
        instituciones={instituciones}
        defaultCargo={targetCargo}
        submitLabel={submitLabel}
        serverError={error}
      />
    </Card>
  );
};
