import { useEffect, useState } from 'react';
import { VALIDATION } from '@shared/config/constants';
import { teachersApi } from '@shared/api/teachers.api';
import { mensajeDeBusquedaPorDni } from '../lib/mensaje-de-dni';

export interface PersonaRoles {
  esDocente: boolean;
  docenteInstitucionId: string | null;
  docenteNivelEducativo: string | null;
  docenteCargosActivos: string[];
  esDirector: boolean;
  esCoordinadorPedagogico: boolean;
  esJefeTaller: boolean;
  esDocenteAula: boolean;
  esEspecialista: boolean;
  especialistaCargoActivo: string | null;
  especialistaNivelEducativo: string | null;
  especialistaModalidad: string | null;
  especialistaEstado: string | null;
}

export interface PersonaAutocompleteData {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string | null;
  tieneUsuario: boolean;
  roles: PersonaRoles;
  docente?: {
    id: string;
    institucionId: string | null;
    nivelEducativo: string | null;
    condicionLaboral: string | null;
    escalaMagisterial: number | null;
    cargosActivos: string[];
    cursoAsignado?: string | null;
    especialidad?: string | null;
    institucion?: {
      id: string;
      nombre: string;
      codigoModular: string;
      nivel: string;
    };
  } | null;
}

export interface UseDniAutocompleteResult {
  data: PersonaAutocompleteData | null;
  isLoading: boolean;
  isFound: boolean;
  isLocked: boolean;
  message: string;
}

/** Lo que devolvió la búsqueda, junto al DNI que la originó. */
interface Resultado {
  dni: string;
  persona: PersonaAutocompleteData | null;
}

export const useDniAutocomplete = (dni: string, enabled = true): UseDniAutocompleteResult => {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const dniCompleto = enabled && dni.length === VALIDATION.DNI_LENGTH;
  const resueltoParaEsteDni = resultado?.dni === dni;

  useEffect(() => {
    if (!dniCompleto) return;

    // Una respuesta que llega tarde no debe pisar a la del DNI actual.
    let cancelado = false;

    (async () => {
      try {
        const res = await teachersApi.findByDni(dni);
        if (cancelado) return;

        const persona = res.ok && res.data ? (res.data as PersonaAutocompleteData) : null;
        setResultado({ dni, persona });
      } catch (err) {
        if (cancelado) return;
        console.error('[useDniAutocomplete] Error:', err);
        // También se registra el fallo contra este DNI: sin esto la pantalla
        // se quedaría diciendo «Buscando...» para siempre.
        setResultado({ dni, persona: null });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [dni, dniCompleto]);

  /**
   * Los tres estados se derivan y no se guardan.
   *
   * Antes eran `useState` que un efecto limpiaba con `setTimeout(…, 0)`, y uno
   * de esos temporizadores no tenía limpieza: al escribir un dígito más
   * mientras la búsqueda estaba en vuelo, `setIsLoading(true)` se aplicaba
   * después de que la petición se diera por cancelada, y el `finally` que lo
   * habría apagado ya no corría. El campo se quedaba en «Buscando...» hasta
   * volver a completar ocho dígitos.
   */
  const data = dniCompleto && resueltoParaEsteDni ? (resultado?.persona ?? null) : null;
  const isLoading = dniCompleto && !resueltoParaEsteDni;
  const isFound = !!data;

  return {
    data,
    isLoading,
    isFound,
    isLocked: isFound,
    message: mensajeDeBusquedaPorDni({ buscando: isLoading, persona: data }),
  };
};
