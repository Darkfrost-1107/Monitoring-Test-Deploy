import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { useEspecialistaService } from '@features/especialistas';
import { EspecialistaFormBase } from '@features/especialistas';
import { Card } from '@shared/ui/card';
import type { EspecialistaFormData } from '@entities/model-especialistas/validator';
import { esErrorDeCelular } from '@shared/lib/errores-formulario';
import { cargoDesignable, type RolDesignable } from './cargos-designables';

interface SuperadminCreatePageProps {
  targetRole: RolDesignable;
}

export const SuperadminCreatePage = ({ targetRole }: SuperadminCreatePageProps) => {
  const navigate = useNavigate();
  const { createEspecialista, loading, error } = useEspecialistaService();

  // Cargo y rol no son lo mismo: el Director de UGEL se registra en el padrón
  // con cargo «Especialista». La correspondencia vive en `cargos-designables`.
  const cargo = cargoDesignable(targetRole);

  const handleFormSubmit = async (formData: EspecialistaFormData) => {
    const result = await createEspecialista(formData, targetRole, cargo.cargoEnElPadron);
    if (result.success) navigate(cargo.ruta);
  };

  const initialData: EspecialistaFormData = {
    nombres: '',
    apellidos: '',
    dni: '',
    correo: '',
    celular: '',
    especialidades: [],
    especialidad: '',
    especialidadesExtras: [],
    nivelEducativo: 'Primaria',
    modalidad: 'EBR',
    cargo: cargo.cargoEnElPadron,
    activo: true,
    condicionLaboral: cargo.condicionLaboral,
    cargaLaboral: 40,
    escalaMagisterial: undefined,
  };

  return (
    <div className="flex flex-col gap-6 max-w-[820px] mx-auto w-full animate-in fade-in-0 duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(cargo.ruta)}
          className="p-2.5 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <PageHeader
            title="Registrar Nuevo Especialista"
            description="Complete los datos para registrar un nuevo especialista en el sistema."
          />
        </div>
      </div>

      <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
        {error && !esErrorDeCelular(error) && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <EspecialistaFormBase
          onSubmit={handleFormSubmit}
          onCancel={() => navigate(cargo.ruta)}
          isLoading={loading}
          initialData={initialData}
          serverError={error}
          isSuperadminCreate={true}
          targetRole={targetRole}
        />
      </Card>
    </div>
  );
};
