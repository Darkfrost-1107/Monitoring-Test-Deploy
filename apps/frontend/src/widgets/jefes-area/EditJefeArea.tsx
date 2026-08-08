import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import {
  JefeAreaFormBase,
  useJefeAreaService,
  mapApiJefeAreaToFrontend,
} from '@features/jefes-area';
import { type JefeArea } from '@entities/model-jefes-area';
import { jefesAreaApi } from '@shared/api/jefes-area.api';
import { Card } from '@shared/ui/card';
import { Spinner } from '@shared/ui/Spinner';
import type { JefeAreaFormData } from '@entities/model-jefes-area/validator';

interface EditJefeAreaProps {
  routePrefix?: string;
}

export const EditJefeArea = ({ routePrefix = '/jefes-area' }: EditJefeAreaProps = {}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateJefeArea, loading, error } = useJefeAreaService();

  const [jefe, setJefe] = useState<JefeArea | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchJefe = async () => {
      if (!id) return;
      setFetching(true);
      try {
        const res = await jefesAreaApi.findById(id);
        if (res.ok && res.data) {
          setJefe(mapApiJefeAreaToFrontend(res.data));
        } else {
          setJefe(null);
        }
      } catch (err) {
        console.error('Error fetching jefe de area for edit:', err);
        setJefe(null);
      } finally {
        setFetching(false);
      }
    };
    fetchJefe();
  }, [id]);

  if (fetching) {
    return (
      <div className="w-full h-[30vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">
          Cargando datos del jefe de área...
        </span>
      </div>
    );
  }

  if (!jefe) {
    return (
      <div className="p-6 text-center text-text-muted font-medium bg-surface border border-border rounded-2xl">
        No se encontró el registro del Jefe de Área especificado.
      </div>
    );
  }

  // El nivel no se edita acá —se decide al ascender— pero el formulario lo
  // necesita para su esquema. Un registro cuyo nivel el sistema no reconoce no
  // se puede editar sin inventarle uno: se dice y se detiene.
  if (!jefe.nivelEducativo) {
    return (
      <div className="p-6 text-center text-text-muted font-medium bg-surface border border-border rounded-2xl">
        Este Jefe de Área tiene un nivel educativo que el sistema no reconoce. Corrija el dato en el
        padrón antes de editar el registro.
      </div>
    );
  }

  const initialData: JefeAreaFormData = {
    nombres: jefe.nombres,
    apellidos: jefe.apellidos,
    dni: jefe.dni,
    correo: jefe.correo,
    celular: jefe.celular,
    cargaHoraria: jefe.cargaHoraria,
    nivelEducativo: jefe.nivelEducativo,
    activo: jefe.activo,
  };

  const handleFormSubmit = async (formData: JefeAreaFormData) => {
    if (!id) return;
    const result = await updateJefeArea(id, formData, 'jefe_area');
    if (result.success) {
      navigate(routePrefix);
    }
  };

  return (
    <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm p-6 sm:p-8">
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <JefeAreaFormBase
        isEdit={true}
        initialData={initialData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmit={(data) => handleFormSubmit(data as any)}
        onCancel={() => navigate(routePrefix)}
        isLoading={loading}
      />
    </Card>
  );
};
