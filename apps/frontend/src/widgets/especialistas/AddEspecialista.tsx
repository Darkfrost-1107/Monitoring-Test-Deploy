import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EspecialistaFormBase } from '@features/especialistas';
import { useEspecialistaService } from '@features/especialistas';
import { Card } from '@shared/ui/card';
import type { EspecialistaFormData } from '@entities/model-especialistas/validator';

export const CreateEspecialistaCard = () => {
  const navigate = useNavigate();
  const { createEspecialista, loading, error } = useEspecialistaService();

  const handleFormSubmit = async (formData: EspecialistaFormData) => {
    const result = await createEspecialista(formData);
    if (result.success) {
      toast.success('Especialista registrado correctamente');
      navigate('/especialistas');
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

      <EspecialistaFormBase
        onSubmit={handleFormSubmit}
        onCancel={() => navigate('/especialistas')}
        isLoading={loading}
        serverError={error}
      />
    </Card>
  );
};
