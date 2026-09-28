import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstitutionFormBase,
  type InstitutionRawInput,
} from '@/features/institutions/ui/CreateInstitutionFormBase';
import { useInstitutionService } from '@/features/institutions/institution-service';
import { Card } from '@shared/ui/card';

interface CreateInstitutionCardProps {
  routePrefix?: string;
}

export const CreateInstitutionCard = ({ routePrefix = '/instituciones/padron' }: CreateInstitutionCardProps = {}) => {
  const navigate = useNavigate();
  const { createInstitution, loading, error } = useInstitutionService();

  const handleFormSubmit = async (formData: InstitutionRawInput) => {
    const result = await createInstitution(formData);
    if (result.success) {
      toast.success('Institución registrada correctamente');
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
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(routePrefix)}
        isLoading={loading}
      />
    </Card>
  );
};
