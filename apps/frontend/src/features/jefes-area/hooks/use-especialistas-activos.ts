import { useState, useEffect, useMemo } from 'react';
import { especialistasApi } from '@shared/api/especialistas.api';
import type { IEspecialistaResponse } from '@sistema-monitoreo/shared-contracts';
import { nivelesOcupados, primerNivelLibre, type NivelJefeArea } from '../lib/niveles-jefe-area';

/**
 * La plana de especialistas activos, para decidir un ascenso a Jefe de Área.
 *
 * Era un `useEffect` de 28 líneas dentro de `JefeAreaFormBase` que corría sólo
 * en modo creación y dejaba tres estados sueltos entre los del formulario de
 * edición, con el que no tiene nada que ver.
 */

interface Resultado {
  especialistas: IEspecialistaResponse[];
  /** Niveles que ya tienen Jefe de Área activo. */
  ocupados: NivelJefeArea[];
  /** Nivel sobre el que abrir el formulario, o nulo si no queda ninguno. */
  nivelInicial: NivelJefeArea | null;
  cargando: boolean;
  error: string | null;
}

export function useEspecialistasActivos(habilitado: boolean): Resultado {
  const [especialistas, setEspecialistas] = useState<IEspecialistaResponse[]>([]);
  const [cargando, setCargando] = useState(habilitado);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!habilitado) return;

    // La respuesta se descarta si el componente se desmontó mientras llegaba.
    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const respuesta = await especialistasApi.findAll({ estado: 'Activo' });
        if (!vigente) return;

        if (respuesta.ok && respuesta.data) setEspecialistas(respuesta.data);
        else setError('No se pudo cargar la lista de especialistas aptos.');
      } catch (err) {
        if (!vigente) return;
        setError('Error al conectar con el servidor.');
        console.error('Error al cargar especialistas para el ascenso:', err);
      } finally {
        if (vigente) setCargando(false);
      }
    };

    void cargar();
    return () => {
      vigente = false;
    };
  }, [habilitado]);

  const ocupados = useMemo(() => nivelesOcupados(especialistas), [especialistas]);

  return {
    especialistas,
    ocupados,
    nivelInicial: primerNivelLibre(ocupados),
    cargando,
    error,
  };
}
