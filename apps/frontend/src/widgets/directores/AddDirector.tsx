import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@shared/ui/card';
import { Spinner } from '@shared/ui/Spinner';
import { DirectorFormBase } from '@features/directores';
import type { DirectorFormData } from '@entities/model-docentes/validator';
import type { DocenteFormData } from '@entities/model-docentes/validator';
import type { Docente } from '@entities/model-docentes';
import { PAGINATION } from '@shared/config/constants';
import { useDocenteService, mapApiDocenteToFrontend } from '@features/docentes/docente-service';
import { teachersApi } from '@shared/api/teachers.api';
import { institutionsApi } from '@shared/api/institutions.api';
import type { IInstitucionResponse } from '@sistema-monitoreo/shared-contracts';

export const CreateDirectorCard = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [instituciones, setInstituciones] = useState<IInstitucionResponse[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [fetching, setFetching] = useState(true);
  const { createDocente, loading: saving, error: serviceError } = useDocenteService();

  useEffect(() => {
    const loadData = async () => {
      setFetching(true);
      try {
        const [instsRes, teachersRes] = await Promise.all([
          institutionsApi.findAll({ limit: PAGINATION.MAX_LIMIT, estado: 'Activa' }),
          teachersApi.findAll(),
        ]);
        if (instsRes.ok && instsRes.data) {
          setInstituciones(instsRes.data.data);
        }
        if (teachersRes.ok && teachersRes.data) {
          setDocentes(teachersRes.data.map(mapApiDocenteToFrontend));
        }
      } catch (err) {
        console.error('Error fetching data for AddDirector:', err);
      } finally {
        setFetching(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (data: DirectorFormData) => {
    const ie = instituciones.find((i) => i.id === data.institucionId);
    if (!ie) {
      setError('La institución seleccionada no existe.');
      return;
    }

    const docenteFormData: DocenteFormData = {
      nombres: data.nombres,
      apellidos: data.apellidos,
      dni: data.dni,
      correo: data.correo,
      celular: data.celular,
      nivelEducativo: data.nivelEducativo as DocenteFormData['nivelEducativo'],
      condicion: data.condicion as DocenteFormData['condicion'],
      especialidad: data.especialidad,
      cargaHoraria: data.cargaHoraria,
      secciones: [],
      escala: data.escala,
      institucionId: data.institucionId,
      activo: true,
      cargo: 'Director',
    };

    const result = await createDocente(docenteFormData);
    if (result.success) {
      toast.success('Director registrado correctamente');
      navigate('/instituciones/docentes');
    }
  };

  if (fetching) {
    return (
      <div className="w-full h-[30vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">
          Cargando instituciones disponibles...
        </span>
      </div>
    );
  }

  // Filtrar las IEs que ya cuentan con un director activo para evitar duplicidades
  const activeDirectorIds = docentes
    .filter((d) => d.cargo === 'Director' && d.activo)
    .map((d) => d.institucionId);

  const availableInstituciones = instituciones.filter((i) => !activeDirectorIds.includes(i.id));

  const finalError = error || serviceError;
  const esErrorCelular = finalError?.toLowerCase().includes('celular') || finalError?.toLowerCase().includes('teléfono');

  return (
    <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
      {finalError && !esErrorCelular && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {finalError}
        </div>
      )}

      <DirectorFormBase
        onSubmit={handleSubmit}
        onCancel={() => navigate('/instituciones/docentes')}
        isLoading={saving}
        instituciones={availableInstituciones.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          nivel: i.nivelEducativo,
        }))}
        serverError={finalError}
      />
    </Card>
  );
};
