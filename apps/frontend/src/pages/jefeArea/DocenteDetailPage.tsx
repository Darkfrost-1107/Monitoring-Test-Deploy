import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, User, Briefcase } from 'lucide-react';
import { type Docente } from '@entities/model-docentes';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Spinner } from '@shared/ui/Spinner';
import { fetchDocenteById } from '@features/docentes/docente-service';
import { fetchInstitucionById } from '@features/institutions/institution-service';
import { DocenteCargosWidget } from '@widgets/docentes/DocenteCargosWidget';

const nivelLabel = (n: string) => n.charAt(0) + n.slice(1).toLowerCase();

export const DocenteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [director, setDirector] = useState<Docente | null>(null);
  const [instName, setInstName] = useState('I.E. No Asignada');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const found = await fetchDocenteById(id);
        if (found) {
          setDirector(found);
          if (found.institucionId) {
            const inst = await fetchInstitucionById(found.institucionId);
            if (inst) {
              setInstName(inst.nombre);
            }
          }
        } else {
          setDirector(null);
        }
      } catch (err) {
        console.error('Error fetching director detail:', err);
        setDirector(null);
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
        <span className="text-text-muted text-sm font-medium">Cargando ficha del director...</span>
      </div>
    );
  }

  if (!director) {
    return (
      <div className="w-full max-w-[820px] mx-auto text-center py-20 bg-surface border border-border rounded-2xl shadow-sm mt-6">
        <h2 className="text-xl font-bold text-text mb-2">Director no encontrado</h2>
        <p className="text-text-muted mb-6">
          El identificador {id} no existe o no tiene permisos de acceso.
        </p>
        <button
          onClick={() => navigate('/instituciones/docentes')}
          className="px-5 py-2.5 bg-bg border border-border rounded-xl font-semibold text-text hover:bg-muted transition-colors cursor-pointer"
        >
          Volver al Padrón de Directores
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[820px] mx-auto w-full animate-in fade-in-0 duration-300 pb-10">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface p-4 border border-border rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instituciones/docentes')}
            className="p-2 rounded-xl bg-bg border border-border text-text-muted hover:text-text hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text m-0 leading-tight">Ficha del Docente/Director</h1>
            <p className="text-text-muted text-[0.8rem] m-0">Detalle laboral y de contacto</p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/instituciones/docentes/${director.id}/editar`)}
          className="flex items-center gap-2 font-bold cursor-pointer bg-primary text-white hover:bg-primary-hover"
        >
          <Edit className="h-[16px] w-[16px]" />
          Editar Ficha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
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
                {director.apellidos}, {director.nombres}
              </span>
            </div>
            <div>
              <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                DNI
              </span>
              <span className="text-sm font-semibold text-text">{director.dni}</span>
            </div>
            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/40">
              <Mail className="w-4.5 h-4.5 text-text-muted" />
              <div className="flex flex-col">
                <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider">
                  Correo UGEL / I.E.
                </span>
                <span className="text-xs font-semibold text-text">{director.correo}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/40">
              <Phone className="w-4.5 h-4.5 text-text-muted" />
              <div className="flex flex-col">
                <span className="text-[0.65rem] text-text-muted uppercase font-bold tracking-wider">
                  Teléfono de Contacto
                </span>
                <span className="text-xs font-semibold text-text">{director.celular}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Situación Laboral */}
        <Card className="p-6 border border-border shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-text">Situación Laboral Base</h3>
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
                {director.cargo === 'Director' ? `Director de ${nivelLabel(director.nivelEducativo)}` : director.cargo}
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
                <span className="text-xs font-bold text-text">{director.condicion}</span>
              </div>
              <div>
                <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                  Escala Magisterial
                </span>
                <span className="text-xs font-bold text-text">Escala {director.escala ?? "no registrada"}</span>
              </div>
            </div>
            <div>
              <span className="text-[0.68rem] text-text-muted uppercase font-bold tracking-wider block">
                Nivel Educativo
              </span>
              <span className="text-xs font-semibold text-text uppercase">
                {director.nivelEducativo}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {director.cargosList && director.cargosList.length > 0 && (
        <DocenteCargosWidget
          docenteId={director.id}
          cargosList={director.cargosList}
          onCargosChanged={() => {
            // Force a reload of the current page
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};
