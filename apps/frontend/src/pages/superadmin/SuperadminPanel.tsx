import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@shared/ui/table';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { useGetCandidatos, useAsignarRol } from './use-superadmin';
import type { Candidato } from './superadmin.api';
import { cargoDesignable, contraparteDe, esRolDesignable, type RolDesignable } from './cargos-designables';
import { candidatosQueCoinciden } from './busqueda-de-candidatos';
import { FilaDeCandidato } from './components/FilaDeCandidato';
import { ResumenDeDesignaciones } from './components/ResumenDeDesignaciones';

/**
 * Designación de los dos cargos de conducción de la UGEL.
 *
 * Eran 315 líneas, y doce ternarios `targetRole === 'director_ugel' ? … : …`
 * describían las diferencias entre un cargo y el otro: títulos, rótulos, rutas
 * y colores. Ahora viven en `cargos-designables.ts`, con los códigos de rol
 * tomados de `RoleCode` en vez de literales sueltos.
 */

const COLUMNAS = [
  { titulo: 'DNI', clase: 'w-[120px] pl-5' },
  { titulo: 'Nombres Completos', clase: 'w-[28%]' },
  { titulo: 'Correo Electrónico', clase: 'w-[28%]' },
  { titulo: 'Rol Actual', clase: 'w-[160px]' },
  { titulo: 'Acción', clase: 'w-[170px] text-right pr-5' },
];

interface SuperadminPanelProps {
  targetRole: RolDesignable;
}

export const SuperadminPanel = ({ targetRole }: SuperadminPanelProps) => {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { data: candidatos, isLoading, isError } = useGetCandidatos();
  const asignarRol = useAsignarRol();

  const [busqueda, setBusqueda] = useState('');
  // Candidato pendiente de confirmar la designación (null = modal cerrado).
  const [aConfirmar, setAConfirmar] = useState<Candidato | null>(null);

  const cargo = cargoDesignable(targetRole);
  const contraparte = cargoDesignable(contraparteDe(targetRole));

  // react-query expone los argumentos de la mutación en vuelo: así sabemos
  // exactamente qué fila se está designando y mostramos el spinner solo ahí.
  const designandoId = asignarRol.isPending ? asignarRol.variables?.usuarioId : null;

  const esSuperusuario = isAuthenticated && user?.role === RoleCode.SUPERUSUARIO;

  useEffect(() => {
    if (!esSuperusuario) navigate('/login', { replace: true });
  }, [esSuperusuario, navigate]);

  const visibles = useMemo(
    () => candidatosQueCoinciden(candidatos ?? [], busqueda),
    [candidatos, busqueda],
  );

  const enElCargo = candidatos?.find((c) => c.rolCodigo === targetRole);
  const enLaContraparte = candidatos?.find((c) => c.rolCodigo === contraparte.rol);
  const elegibles = candidatos?.filter((c) => !esRolDesignable(c.rolCodigo)).length ?? 0;

  if (!esSuperusuario) return null;

  const nombreDe = (candidato: Candidato) => `${candidato.nombres} ${candidato.apellidos}`;

  const designar = (candidato: Candidato) => {
    asignarRol.mutate(
      { usuarioId: candidato.id, roleCode: targetRole },
      {
        onSuccess: (res) => toast.success(res.message || 'Rol asignado exitosamente'),
        onError: (err) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error(error.response?.data?.message || 'Ocurrió un error al asignar el rol');
        },
      },
    );
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title={`Designar ${cargo.nombreCorto}`}
        description={`Asignación y gestión del cargo de ${cargo.nombre}.`}
      />

      <div className="bg-primary-light p-4 rounded-xl flex items-start gap-3 border border-primary/20 animate-in fade-in-0 duration-300">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-primary-dark">
          <strong className="font-bold text-primary">Atención:</strong> Esta interfaz es de uso
          exclusivo para asignar al {cargo.nombre}. Al asignar este cargo a una nueva persona, el
          funcionario anterior regresará automáticamente a su rol de Especialista base.
        </div>
      </div>

      {!isLoading && !isError && candidatos && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <ResumenDeDesignaciones
            cargo={cargo}
            contraparte={contraparte}
            enElCargo={enElCargo}
            enLaContraparte={enLaContraparte}
            elegibles={elegibles}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Directorio de Personal</h2>
            <p className="text-xs text-text-muted font-medium">
              Seleccione un especialista para asignar el cargo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(cargo.rutaDeAlta)}
            className="h-8 shrink-0 font-semibold cursor-pointer"
          >
            Registrar Nuevo
          </Button>
          <div className="relative w-full sm:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar personal por DNI o nombre"
              placeholder="Buscar por DNI, nombres..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
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
                {COLUMNAS.map((columna) => (
                  <TableHead
                    key={columna.titulo}
                    className={`font-semibold text-text ${columna.clase}`}
                  >
                    {columna.titulo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((candidato) => (
                <FilaDeCandidato
                  key={candidato.id}
                  candidato={candidato}
                  cargo={cargo}
                  yaLoOcupa={candidato.rolCodigo === targetRole}
                  ocupaLaContraparte={candidato.rolCodigo === contraparte.rol}
                  designando={designandoId === candidato.id}
                  bloqueado={asignarRol.isPending}
                  onDesignar={() => setAConfirmar(candidato)}
                />
              ))}

              {visibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNAS.length} className="h-32 text-center text-text-muted">
                    <SinResultados busqueda={busqueda} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {aConfirmar && (
        <ConfirmModal
          title={`Designar ${cargo.nombreCorto}`}
          message={
            <div className="space-y-2">
              <p>
                Vas a designar a <strong className="text-text">{nombreDe(aConfirmar)}</strong> como{' '}
                {cargo.nombre}.
              </p>
              {enElCargo && enElCargo.id !== aConfirmar.id && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-amber-800 text-xs">
                  <strong>{nombreDe(enElCargo)}</strong> dejará el cargo y volverá automáticamente a
                  su rol de Especialista base.
                </div>
              )}
              <p>¿Deseas continuar?</p>
            </div>
          }
          confirmLabel={cargo.confirmarDesignacion}
          onConfirm={() => {
            designar(aConfirmar);
            setAConfirmar(null);
          }}
          onCancel={() => setAConfirmar(null)}
        />
      )}
    </div>
  );
};

/** El mensaje distingue «no coincide nada» de «no hay nadie cargado». */
const SinResultados = ({ busqueda }: { busqueda: string }) => {
  const termino = busqueda.trim();

  if (termino) {
    return (
      <>
        No se encontraron personas para <strong className="text-text">«{termino}»</strong>.
        <br />
        <span className="text-xs">Revisa el DNI o el nombre e intenta de nuevo.</span>
      </>
    );
  }

  return (
    <>
      Aún no hay personal registrado.
      <br />
      <span className="text-xs">Usa «Registrar Nuevo» para agregar a la primera persona.</span>
    </>
  );
};
