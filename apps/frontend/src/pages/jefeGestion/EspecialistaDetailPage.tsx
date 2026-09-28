import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, User, Briefcase, BookOpen, BadgeCheck } from 'lucide-react';
import { type Especialista } from '@entities/model-especialistas';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Spinner } from '@shared/ui/Spinner';
import { fetchEspecialistaById } from '@features/especialistas/especialista-service';

export const EspecialistaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [especialista, setEspecialista] = useState<Especialista | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      const esp = await fetchEspecialistaById(id);
      setEspecialista(esp);
      setLoading(false);
    };

    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">
          Cargando ficha de especialista...
        </span>
      </div>
    );
  }

  if (!especialista) {
    return (
      <div className="w-full max-w-[820px] mx-auto text-center py-20 bg-surface border border-border rounded-2xl shadow-sm mt-6">
        <h2 className="text-xl font-bold text-text mb-2">Especialista no encontrado</h2>
        <p className="text-text-muted mb-6">
          El código identificador {id} no existe o no tiene permisos de acceso.
        </p>
        <button
          onClick={() => navigate('/especialistas')}
          className="px-5 py-2.5 bg-bg border border-border rounded-xl font-semibold text-text hover:bg-muted transition-colors cursor-pointer"
        >
          Volver a Especialistas
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
            onClick={() => navigate('/especialistas')}
            className="p-2 rounded-xl bg-bg border border-border text-text-muted hover:text-text hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text m-0 leading-tight">Ficha de Especialista</h1>
            <p className="text-text-muted text-[0.8rem] m-0">Perfil del equipo UGEL de monitoreo</p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/especialistas/${especialista.id}/editar`)}
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
          {/* Card 1: Información Personal */}
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
                  {especialista.apellidos}, {especialista.nombres}
                </span>
              </div>

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  DNI
                </span>
                <span className="text-sm font-semibold text-text">{especialista.dni}</span>
              </div>

              <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <Mail className="w-4.5 h-4.5 text-text-muted" />
                <div className="flex flex-col">
                  <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider">
                    Correo Institucional
                  </span>
                  <span className="text-xs font-semibold text-text">{especialista.correo || 'No registrado'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <Phone className="w-4.5 h-4.5 text-text-muted" />
                <div className="flex flex-col">
                  <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider">
                    Teléfono de Contacto
                  </span>
                  <span className="text-xs font-semibold text-text">{especialista.celular || 'No registrado'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Lado Derecho: Detalles Laborales */}
        <div className="flex flex-col gap-6">
          {/* Card 2: Cargo y Situación */}
          <Card className="p-6 border border-border shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-text">Detalles Laborales</h3>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block mb-1">
                  Cargo
                </span>
                <Badge
                  variant="default"
                  className="text-xs font-bold px-3 py-0.5 uppercase tracking-wide"
                >
                  {especialista.cargo || 'Especialista'}
                </Badge>
              </div>

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Condición Laboral
                </span>
                <span className="text-sm font-semibold text-text">
                  {especialista.condicionLaboral || 'No especificada'}
                </span>
              </div>

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Carga Laboral
                </span>
                <span className="text-sm font-semibold text-text">
                  {especialista.cargaLaboral || 40} horas
                </span>
              </div>

              {especialista.escalaMagisterial !== undefined &&
                especialista.escalaMagisterial !== null && (
                  <div>
                    <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                      Escala Magisterial
                    </span>
                    <span className="text-sm font-semibold text-text">
                      Escala {especialista.escalaMagisterial}
                    </span>
                  </div>
                )}

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block mb-1">
                  Especialidad Principal
                </span>
                {especialista.especialidad ? (
                  <Badge
                    variant="default"
                    className="text-xs px-2.5 py-0.5 uppercase font-bold bg-primary/10 text-primary border border-primary/20"
                  >
                    {especialista.especialidad}
                  </Badge>
                ) : (
                  <span className="text-sm font-semibold text-text">No especificada</span>
                )}
              </div>

              {especialista.nivelEducativo === 'Secundaria' && especialista.especialidadesExtras && especialista.especialidadesExtras.length > 0 && (
                <div>
                  <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block mb-1">
                    Especialidades Extras / Temporales
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {especialista.especialidadesExtras.map((esp) => (
                      <Badge
                        key={esp}
                        variant="secondary"
                        className="text-[0.65rem] px-2 py-0 uppercase font-bold"
                      >
                        {esp}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Estado
                </span>
                <Badge
                  variant={especialista.activo ? 'default' : 'secondary'}
                  className={`text-[0.65rem] py-0 px-2 uppercase font-bold mt-1 ${
                    especialista.activo
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}
                >
                  {especialista.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Card 3: Niveles Educativos Asignados */}
      <Card className="p-6 border border-border shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-text">Niveles Educativos a su Cargo</h3>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {especialista.nivelEducativo && (
            <div className="flex items-center gap-1.5 bg-muted/30 border border-border/80 px-3.5 py-2 rounded-xl text-xs font-bold text-text">
              <BadgeCheck className="w-4 h-4 text-green-500 shrink-0" />
              <span>
                {especialista.nivelEducativo}
                {especialista.modalidad ? ` - ${especialista.modalidad}` : ''}
              </span>
            </div>
          )}
          {!especialista.nivelEducativo && (
            <span className="text-xs text-text-muted italic">
              No se han registrado niveles educativos.
            </span>
          )}
        </div>
      </Card>
    </div>
  );
};
