import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  User,
  Briefcase,
  BookOpen,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import { type Docente } from '@entities/model-docentes';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Spinner } from '@shared/ui/Spinner';
import { fetchDocenteById } from '@features/docentes/docente-service';
import { fetchInstitucionById } from '@features/institutions/institution-service';

export const DocenteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/instituciones/docentes';

  const [docente, setDocente] = useState<Docente | null>(null);
  const [instName, setInstName] = useState('I.E. No Asignada');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const found = await fetchDocenteById(id);
        if (found) {
          setDocente(found);
          if (found.institucionId) {
            const inst = await fetchInstitucionById(found.institucionId);
            if (inst) {
              setInstName(inst.nombre);
            }
          }
        } else {
          setDocente(null);
        }
      } catch (err) {
        console.error('Error fetching teacher detail:', err);
        setDocente(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando ficha de docente...</span>
      </div>
    );
  }

  if (!docente) {
    return (
      <div className="w-full max-w-[820px] mx-auto text-center py-20 bg-surface border border-border rounded-2xl shadow-sm mt-6">
        <h2 className="text-xl font-bold text-text mb-2">Docente no encontrado</h2>
        <p className="text-text-muted mb-6">
          El código identificador {id} no existe o no tiene permisos de acceso.
        </p>
        <button
          onClick={() => navigate(backPath)}
          className="px-5 py-2.5 bg-bg border border-border rounded-xl font-semibold text-text hover:bg-muted transition-colors cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[820px] mx-auto w-full animate-in fade-in-0 duration-300">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface p-4 border border-border rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 rounded-xl bg-bg border border-border text-text-muted hover:text-text hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text m-0 leading-tight">Ficha de Docente</h1>
            <p className="text-text-muted text-[0.8rem] m-0">Detalle laboral y de contacto</p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`${backPath}/${docente.id}/editar`, { state: { from: backPath } })}
          className="flex items-center gap-2 font-bold cursor-pointer bg-primary text-white hover:bg-primary-hover"
        >
          <Edit className="h-[16px] w-[16px]" />
          Editar Ficha
        </Button>
      </div>

      {/* Ficha Completa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado izquierdo: Perfil General */}
        <div className="flex flex-col gap-6">
          <Card className="p-6 border border-border shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-text">Información Personal</h3>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Apellidos y Nombres
                </span>
                <span className="text-base font-bold text-text">
                  {docente.apellidos}, {docente.nombres}
                </span>
              </div>

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  DNI
                </span>
                <span className="text-sm font-semibold text-text">{docente.dni}</span>
              </div>

              <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <Mail className="w-4.5 h-4.5 text-text-muted" />
                <div className="flex flex-col">
                  <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider">
                    Correo UGEL / I.E.
                  </span>
                  <span className="text-xs font-semibold text-text">{docente.correo}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <Phone className="w-4.5 h-4.5 text-text-muted" />
                <div className="flex flex-col">
                  <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider">
                    Teléfono de Contacto
                  </span>
                  <span className="text-xs font-semibold text-text">{docente.celular}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Lado Derecho: Detalles Laborales */}
        <div className="flex flex-col gap-6">
          <Card className="p-6 border border-border shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-text">Situación Laboral</h3>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block mb-1">
                  Cargo Desempeñado
                </span>
                <Badge
                  variant="default"
                  className="text-xs font-bold px-3 py-0.5 uppercase tracking-wide"
                >
                  {docente.cargo}
                </Badge>
              </div>

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Institución Vinculada (I.E.)
                </span>
                <span className="text-sm font-semibold text-text">{instName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                    Condición
                  </span>
                  <span className="text-xs font-bold text-text">{docente.condicion}</span>
                </div>
                <div>
                  <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                    Escala Magisterial
                  </span>
                  <span className="text-xs font-bold text-text">Escala {docente.escala ?? "no registrada"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                    Nivel Educativo
                  </span>
                  <span className="text-xs font-semibold text-text uppercase">
                    {docente.nivelEducativo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4.5 h-4.5 text-text-muted" />
                  <div>
                    <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider block">
                      Carga Horaria
                    </span>
                    <span className="text-xs font-bold text-text">
                      {docente.cargaHoraria} hrs/sem
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Especialidad
                </span>
                <span className="text-xs font-semibold text-text">{docente.especialidad}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Card 3: Secciones */}
      <Card className="p-6 border border-border shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-text">Grados y Secciones a su Cargo</h3>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {(docente.secciones || []).map((sec) => (
            <div
              key={sec.id}
              className="flex items-center gap-1.5 bg-muted/30 border border-border/80 px-3.5 py-2 rounded-xl text-xs font-bold text-text"
            >
              <BadgeCheck className="w-4 h-4 text-green-500 shrink-0" />
              <span>
                {sec.grado} "{sec.seccion}"
              </span>
            </div>
          ))}
          {(docente.secciones || []).length === 0 && (
            <span className="text-xs text-text-muted italic">
              No se han registrado grados asignados.
            </span>
          )}
        </div>
      </Card>

    </div>
  );
};
