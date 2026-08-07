import { useState } from 'react';
import { motivoDeRechazo } from '../lib/archivo-plan';

/**
 * El formulario de registro de un plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran siete `useState` y dos manejadores
 * sueltos en `PlanMonitoreoAnualPage`, entre los del listado y los de los
 * modales de confirmación.
 */

export interface DatosDelPlan {
  file: File;
  titulo: string;
  anioAcademico: number;
  tipoEntidad: 'UGEL' | 'IE';
  estado: 'Activo' | 'Inactivo';
}

interface Opciones {
  /** Determinado por el alcance del usuario, no elegido en el formulario. */
  entidad: 'UGEL' | 'IE';
  onEnviar: (datos: DatosDelPlan) => Promise<{ success: boolean }>;
}

export function useFormularioPlan({ entidad, onEnviar }: Opciones) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [intentoDeEnvio, setIntentoDeEnvio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = () => {
    setError(null);
    setIntentoDeEnvio(false);
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  const elegirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const elegido = e.target.files?.[0];
    if (!elegido) return;

    const motivo = motivoDeRechazo(elegido);
    if (motivo) {
      setError(motivo);
      setArchivo(null);
      return;
    }

    setArchivo(elegido);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntentoDeEnvio(true);
    setError(null);

    if (!titulo.trim() || !archivo) return;

    const resultado = await onEnviar({
      file: archivo,
      titulo: titulo.trim(),
      anioAcademico: Number(anio),
      tipoEntidad: entidad,
      estado,
    });

    if (!resultado.success) return;

    setTitulo('');
    setArchivo(null);
    setEstado('Activo');
    setIntentoDeEnvio(false);
    setAbierto(false);
  };

  return {
    abierto,
    abrir,
    cerrar,
    titulo,
    setTitulo,
    anio,
    setAnio,
    estado,
    setEstado,
    archivo,
    elegirArchivo,
    intentoDeEnvio,
    error,
    enviar,
  };
}
