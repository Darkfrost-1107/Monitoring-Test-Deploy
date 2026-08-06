import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCandidatos, useAsignarRol } from './use-superadmin';
import type { Candidato } from './superadmin.api';
import { useUser } from '@entities/model-user';
import { CheckCircle2, UserCog, Search, AlertCircle, BadgeCheck, Users, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { toast } from 'sonner';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { Badge } from '@shared/ui/badge';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { EntityStats } from '@shared/ui/EntityStats';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@shared/ui/table';

interface SuperadminPanelProps {
  targetRole: 'director_ugel' | 'jefe_gestion';
}

export const SuperadminPanel = ({ targetRole }: SuperadminPanelProps) => {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { data: candidatos, isLoading, isError } = useGetCandidatos();
  const asignarRolMutation = useAsignarRol();
  const [searchTerm, setSearchTerm] = useState('');
  // Candidato pendiente de confirmar la designación (null = modal cerrado).
  const [candidatoAConfirmar, setCandidatoAConfirmar] = useState<Candidato | null>(null);
  // react-query expone los argumentos de la mutación en vuelo: así sabemos
  // exactamente qué fila se está designando y mostramos el spinner solo ahí.
  const pendingId = asignarRolMutation.isPending ? asignarRolMutation.variables?.usuarioId : null;

  useEffect(() => {
    if (!isAuthenticated || user?.role !== RoleCode.SUPERUSUARIO) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || user?.role !== RoleCode.SUPERUSUARIO) return null;

  const filteredCandidatos = candidatos?.filter((c) => 
    c.dni.includes(searchTerm) || 
    c.nombres.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.apellidos.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAssignRole = (candidatoId: string, roleCode: 'director_ugel' | 'jefe_gestion') => {
    asignarRolMutation.mutate({ usuarioId: candidatoId, roleCode }, {
      onSuccess: (res) => {
        toast.success(res.message || 'Rol asignado exitosamente');
      },
      onError: (err) => {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || 'Ocurrió un error al asignar el rol');
      }
    });
  };

  const handleConfirmAssign = () => {
    if (!candidatoAConfirmar) return;
    handleAssignRole(candidatoAConfirmar.id, targetRole);
    setCandidatoAConfirmar(null);
  };

  // Selectores para las tarjetas de estadísticas
  const currentAssignee = candidatos?.find((c) => c.rolCodigo === targetRole);
  const otherRole = targetRole === 'director_ugel' ? 'jefe_gestion' : 'director_ugel';
  const otherAssignee = candidatos?.find((c) => c.rolCodigo === otherRole);
  const eligibleCount = candidatos?.filter(
    (c) => c.rolCodigo !== 'director_ugel' && c.rolCodigo !== 'jefe_gestion'
  ).length || 0;

  const statsCards = [
    {
      title: targetRole === 'director_ugel' ? 'Director de UGEL Actual' : 'Jefe de Gestión Actual',
      value: currentAssignee ? `${currentAssignee.nombres} ${currentAssignee.apellidos}` : 'Sin designar',
      icon: <BadgeCheck className={`w-5 h-5 ${currentAssignee ? 'text-emerald-500' : 'text-danger'}`} strokeWidth={2} />,
      trendText: currentAssignee ? currentAssignee.correo || 'Designación activa' : 'Cargo vacante',
      trendType: currentAssignee ? ('success' as const) : ('danger' as const),
      valueClassName: 'text-xl',
    },
    {
      title: 'Especialistas Elegibles',
      value: eligibleCount,
      icon: <Users className="w-5 h-5 text-primary" strokeWidth={2} />,
      trendText: 'Disponibles para designación',
      trendType: 'neutral' as const,
    },
    {
      title: targetRole === 'director_ugel' ? 'Jefe de Gestión Pedagógica' : 'Director de UGEL Lampa',
      value: otherAssignee ? `${otherAssignee.nombres} ${otherAssignee.apellidos}` : 'Sin designar',
      icon: <Briefcase className="w-5 h-5 text-amber-500" strokeWidth={2} />,
      trendText: otherAssignee ? 'Dupla directiva activa' : 'Cargo de contraparte vacante',
      trendType: otherAssignee ? ('warning' as const) : ('neutral' as const),
      valueClassName: 'text-xl',
    },
  ];

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title={targetRole === 'director_ugel' ? 'Designar Director UGEL' : 'Designar Jefe de Gestión'}
        description={`Asignación y gestión del cargo de ${
          targetRole === 'director_ugel' ? 'Director de la UGEL' : 'Jefe de Gestión Pedagógica'
        }.`}
      />

      <div className="bg-primary-light p-4 rounded-xl flex items-start gap-3 border border-primary/20 animate-in fade-in-0 duration-300">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-primary-dark">
          <strong className="font-bold text-primary">Atención:</strong> Esta interfaz es de uso exclusivo para asignar al{' '}
          {targetRole === 'director_ugel' ? 'Director de la UGEL' : 'Jefe de Gestión Pedagógica'}
          . Al asignar este cargo a una nueva persona, el funcionario anterior regresará automáticamente a su rol de Especialista base.
        </div>
      </div>

      {!isLoading && !isError && candidatos && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <EntityStats cards={statsCards} columns={3} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Directorio de Personal</h2>
            <p className="text-xs text-text-muted font-medium">Seleccione un especialista para asignar el cargo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(targetRole === 'director_ugel' ? '/superadmin/director/nuevo' : '/superadmin/jefe/nuevo')}
            className="h-8 shrink-0 font-semibold cursor-pointer"
          >
            Registrar Nuevo
          </Button>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Buscar personal por DNI o nombre"
              placeholder="Buscar por DNI, nombres..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-[40vh] flex flex-col justify-center items-center gap-3">
          <Spinner />
          <span className="text-text-muted text-sm font-medium">Cargando candidatos...</span>
        </div>
      ) : isError ? (
        <div className="text-center py-10 text-danger font-medium">
          Error al cargar los candidatos. Verifique su conexión.
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[120px] pl-5 font-semibold text-text">DNI</TableHead>
                <TableHead className="w-[28%] font-semibold text-text">Nombres Completos</TableHead>
                <TableHead className="w-[28%] font-semibold text-text">Correo Electrónico</TableHead>
                <TableHead className="w-[160px] font-semibold text-text">Rol Actual</TableHead>
                <TableHead className="w-[170px] text-right pr-5 font-semibold text-text">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidatos.map((candidato) => {
                const isCurrentRole = candidato.rolCodigo === targetRole;
                const isOtherSpecialRole =
                  (targetRole === 'director_ugel' && candidato.rolCodigo === 'jefe_gestion') ||
                  (targetRole === 'jefe_gestion' && candidato.rolCodigo === 'director_ugel');

                const disabledReason = isCurrentRole
                  ? 'Ya ocupa este cargo actualmente.'
                  : isOtherSpecialRole
                    ? `No disponible: ya ejerce como ${candidato.rolActual}.`
                    : undefined;

                return (
                  <TableRow key={candidato.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-5 font-semibold text-text">{candidato.dni}</TableCell>
                    <TableCell>
                      <div className="font-bold text-text text-sm">
                        {candidato.nombres} {candidato.apellidos}
                      </div>
                    </TableCell>
                    <TableCell className="text-text-muted text-sm font-medium">
                      {candidato.correo || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[0.65rem] py-0.5 px-2.5 uppercase font-bold border ${
                          candidato.rolCodigo === 'director_ugel'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : candidato.rolCodigo === 'jefe_gestion'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {candidato.rolActual}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <span title={disabledReason} className="inline-block">
                        <Button
                          size="sm"
                          variant={isCurrentRole ? "default" : "outline"}
                          className={`font-semibold cursor-pointer transition-all ${
                            isCurrentRole
                              ? (targetRole === 'jefe_gestion'
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                : "bg-amber-600 hover:bg-amber-700 text-white border-none")
                              : "text-primary border-primary/20 hover:bg-primary/5 hover:text-primary-hover"
                          }`}
                          disabled={
                            asignarRolMutation.isPending ||
                            isCurrentRole ||
                            isOtherSpecialRole
                          }
                          onClick={() => setCandidatoAConfirmar(candidato)}
                        >
                          {isCurrentRole ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Designado
                            </>
                          ) : pendingId === candidato.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Designando...
                            </>
                          ) : (
                            targetRole === 'director_ugel' ? 'Designar Director' : 'Designar Jefe'
                          )}
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {filteredCandidatos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-text-muted">
                    {searchTerm.trim() ? (
                      <>
                        No se encontraron personas para <strong className="text-text">«{searchTerm.trim()}»</strong>.
                        <br />
                        <span className="text-xs">Revisa el DNI o el nombre e intenta de nuevo.</span>
                      </>
                    ) : (
                      <>
                        Aún no hay personal registrado.
                        <br />
                        <span className="text-xs">Usa «Registrar Nuevo» para agregar a la primera persona.</span>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {candidatoAConfirmar && (
        <ConfirmModal
          title={targetRole === 'director_ugel' ? 'Designar Director UGEL' : 'Designar Jefe de Gestión'}
          message={
            <div className="space-y-2">
              <p>
                Vas a designar a{' '}
                <strong className="text-text">
                  {candidatoAConfirmar.nombres} {candidatoAConfirmar.apellidos}
                </strong>{' '}
                como{' '}
                {targetRole === 'director_ugel' ? 'Director de la UGEL' : 'Jefe de Gestión Pedagógica'}.
              </p>
              {currentAssignee && currentAssignee.id !== candidatoAConfirmar.id && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-amber-800 text-xs">
                  <strong>{currentAssignee.nombres} {currentAssignee.apellidos}</strong> dejará el
                  cargo y volverá automáticamente a su rol de Especialista base.
                </div>
              )}
              <p>¿Deseas continuar?</p>
            </div>
          }
          confirmLabel={targetRole === 'director_ugel' ? 'Sí, designar Director' : 'Sí, designar Jefe'}
          onConfirm={handleConfirmAssign}
          onCancel={() => setCandidatoAConfirmar(null)}
        />
      )}
    </div>
  );
};
