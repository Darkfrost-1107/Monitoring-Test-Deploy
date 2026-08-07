import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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

export const EditDirectorCard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateDocente, loading: saving, error: serviceError } = useDocenteService();

  const [director, setDirector] = useState<Docente | null>(null);
  const [instituciones, setInstituciones] = useState<IInstitucionResponse[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setFetching(true);
      try {
        const [teachersRes, instsRes] = await Promise.all([
          teachersApi.findAll(),
          institutionsApi.findAll({ limit: PAGINATION.MAX_LIMIT, estado: 'Activa' }),
        ]);

        if (teachersRes.ok && teachersRes.data) {
          const mappedDocs = teachersRes.data.map(mapApiDocenteToFrontend);
          setDocentes(mappedDocs);
          const found = mappedDocs.find((d) => d.id === id);
          if (found) {
            setDirector(found);
          }
        }
        if (instsRes.ok && instsRes.data) {
          setInstituciones(instsRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching director edit data:', err);
      } finally {
        setFetching(false);
      }
    };
    loadData();
  }, [id]);

  if (fetching) {
    return (
      <div className="w-full h-[30vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando datos del director...</span>
      </div>
    );
  }

  if (!director) {
    return (
      <div className="p-6 text-center text-text-muted font-medium bg-surface border border-border rounded-2xl">
        No se encontró el director especificado.
      </div>
    );
  }

  const initialData: DirectorFormData = {
    nombres: director.nombres,
    apellidos: director.apellidos,
    dni: director.dni,
    correo: director.correo,
    celular: director.celular,
    condicion: director.condicion as DirectorFormData['condicion'],
    // El formulario exige escala: es un campo obligatorio y visible, así que
    // sembrarlo con la primera es proponer un valor que el usuario confirma,
    // no afirmarlo por él. Distinto del caso de la asignación de cargo, donde
    // se escribía sin que nadie lo viera.
    escala: director.escala ?? 'I',
    institucionId: director.institucionId,
    nivelEducativo: director.nivelEducativo as DirectorFormData['nivelEducativo'],
    especialidad: director.especialidad,
    cargaHoraria: director.cargaHoraria,
  };

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
      activo: director.activo,
      cargo: 'Director',
    };

    const result = await updateDocente(director.id, docenteFormData);
    if (result.success) {
      navigate('/instituciones/docentes');
    }
  };

  // Filtrar las IEs que ya cuentan con un director activo para evitar duplicidades,
  // excluyendo la I.E. que ya tiene el director editado actualmente.
  const activeDirectorIds = docentes
    .filter((d) => d.cargo === 'Director' && d.activo && d.id !== director.id)
    .map((d) => d.institucionId);

  const availableInstituciones = instituciones.filter((i) => !activeDirectorIds.includes(i.id));

  const finalError = error || serviceError;

  return (
    <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
      {finalError && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {finalError}
        </div>
      )}

      <DirectorFormBase
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/instituciones/docentes')}
        isLoading={saving}
        instituciones={availableInstituciones.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          nivel: i.nivelEducativo,
        }))}
        submitLabel="Actualizar Datos"
      />
    </Card>
  );
};
