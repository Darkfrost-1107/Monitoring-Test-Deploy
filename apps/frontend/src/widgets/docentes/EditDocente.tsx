import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { DocenteFormBase } from '@features/docentes';
import { type Docente } from '@entities/model-docentes';
import { useDocenteService, mapApiDocenteToFrontend } from '@features/docentes/docente-service';
import { teachersApi } from '@shared/api/teachers.api';
import { Card } from '@shared/ui/card';
import { Spinner } from '@shared/ui/Spinner';
import type { DocenteFormData } from '@entities/model-docentes/validator';

interface Props {
  instituciones: { id: string; nombre: string }[];
  targetCargo?: 'Director' | 'Coordinador Pedagógico' | 'Jefe de Taller' | 'Docente de Aula';
  routePrefix?: string;
  submitLabel?: string;
}

export const EditDocenteCard = ({
  instituciones,
  targetCargo = 'Director',
  routePrefix = '/instituciones/docentes',
  submitLabel,
}: Props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateDocente, loading, error } = useDocenteService();

  const [docente, setDocente] = useState<Docente | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchDocente = async () => {
      if (!id) return;
      setFetching(true);
      try {
        const res = await teachersApi.findAll();
        if (res.ok && res.data) {
          const found = res.data.find((d) => d.id === id);
          if (found) {
            setDocente(mapApiDocenteToFrontend(found));
          } else {
            setDocente(null);
          }
        }
      } catch (err) {
        console.error('Error fetching teacher for edit:', err);
        setDocente(null);
      } finally {
        setFetching(false);
      }
    };
    fetchDocente();
  }, [id]);

  if (fetching) {
    return (
      <div className="w-full h-[30vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando datos del personal...</span>
      </div>
    );
  }

  if (!docente) {
    return (
      <div className="p-6 text-center text-text-muted font-medium bg-surface border border-border rounded-2xl">
        No se encontró el registro de personal especificado.
      </div>
    );
  }

  const initialData: DocenteFormData = {
    nombres: docente.nombres,
    apellidos: docente.apellidos,
    dni: docente.dni,
    correo: docente.correo,
    celular: docente.celular,
    nivelEducativo: docente.nivelEducativo,
    condicion: docente.condicion as DocenteFormData['condicion'],
    especialidad: docente.especialidad,
    cargaHoraria: docente.cargaHoraria,
    secciones: docente.secciones || [],
    // El formulario exige escala: es un campo obligatorio y visible, así que
    // sembrarlo con la primera es proponer un valor que el usuario confirma,
    // no afirmarlo por él. Distinto del caso de la asignación de cargo, donde
    // se escribía sin que nadie lo viera.
    escala: docente.escala ?? 'I',
    institucionId: docente.institucionId,
    activo: docente.activo,
    cargo: docente.cargo,
  };

  const handleFormSubmit = async (formData: DocenteFormData) => {
    if (!id) return;
    const result = await updateDocente(id, formData);
    if (result.success) {
      navigate(routePrefix);
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

      <DocenteFormBase
        initialData={initialData}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(routePrefix)}
        isLoading={loading}
        instituciones={instituciones}
        defaultCargo={targetCargo}
        submitLabel={submitLabel}
      />
    </Card>
  );
};
