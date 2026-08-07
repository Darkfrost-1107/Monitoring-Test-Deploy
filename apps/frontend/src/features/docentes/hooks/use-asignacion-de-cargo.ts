import { useState, useEffect, useMemo } from 'react';
import { fetchDocentes, fetchCargos, updateDocenteRaw } from '../docente-service';
import type { Docente } from '@entities/model-docentes';
import { escalaANumero } from '@entities/model-docentes/escala';
import {
  candidatosParaCargo,
  cargaHorariaDelCargo,
  condicionInicial,
  type CargoAsignable,
  type CondicionDelCargo,
} from '../lib/asignacion-de-cargo';

/**
 * La asignación de un cargo de institución a un docente de aula.
 *
 * Eran dos efectos, siete estados y el armado del DTO dentro de
 * `DocenteAssignPage`. Uno de los efectos envolvía cada `setState` en un
 * `setTimeout(…, 0)` sin limpieza: cambiar de docente dos veces seguidas dejaba
 * temporizadores en vuelo que podían aplicarse en el orden equivocado.
 */

interface Opciones {
  cargo: CargoAsignable;
  onAsignado: () => void;
}

export function useAsignacionDeCargo({ cargo, onAsignado }: Opciones) {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cargos, setCargos] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);

  const [docenteId, setDocenteId] = useState('');
  const [condicion, setCondicion] = useState<CondicionDelCargo>('Nombrado');
  const [cargaHoraria, setCargaHoraria] = useState(() => cargaHorariaDelCargo(cargo, null));

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      setErrorDeCarga(null);
      try {
        const [todos, catalogo] = await Promise.all([fetchDocentes(), fetchCargos()]);
        if (!vigente) return;

        setDocentes(todos);
        if (catalogo.ok && catalogo.data) setCargos(catalogo.data);
        else setErrorDeCarga('No se pudo cargar el catálogo de cargos.');
      } catch (err) {
        if (!vigente) return;
        setErrorDeCarga('Error al conectar con el servidor.');
        console.error('Error al cargar los datos de la asignación:', err);
      } finally {
        if (vigente) setCargando(false);
      }
    };

    void cargar();
    return () => {
      vigente = false;
    };
  }, []);

  const candidatos = useMemo(() => candidatosParaCargo(docentes, cargo), [docentes, cargo]);

  const elegido = useMemo(
    () => candidatos.find((d) => d.id === docenteId) ?? null,
    [candidatos, docenteId],
  );

  // Al elegir un docente el formulario se siembra con lo suyo, y desde ahí el
  // usuario lo edita. Se ajusta durante el render y no en un efecto: React
  // descarta este render y vuelve a empezar con los valores nuevos, sin pintar
  // el intermedio. La versión anterior lo hacía con `setTimeout(…, 0)` dentro
  // de un efecto —un rodeo para la misma advertencia— que dejaba
  // temporizadores en vuelo al cambiar de docente dos veces seguidas.
  const [sembradoPara, setSembradoPara] = useState<string | null>(null);
  if (elegido && sembradoPara !== elegido.id) {
    setSembradoPara(elegido.id);
    setCondicion(condicionInicial(elegido));
    setCargaHoraria(cargaHorariaDelCargo(cargo, elegido));
  }

  const asignar = async () => {
    if (!elegido) return;

    setGuardando(true);
    setError(null);

    try {
      const cargoEnCatalogo = cargos.find((c) => c.nombre === cargo);
      if (!cargoEnCatalogo) {
        throw new Error(`El cargo «${cargo}» no está disponible en la base de datos.`);
      }

      const respuesta = await updateDocenteRaw(elegido.id, {
        nombres: elegido.nombres,
        apellidos: elegido.apellidos,
        correo: elegido.correo || undefined,
        telefono: elegido.celular || undefined,
        // Coordinador Pedagógico y Jefe de Taller sólo existen en Secundaria.
        nivelEducativo: 'Secundaria',
        cursoAsignado: elegido.especialidad || undefined,
        cargoId: cargoEnCatalogo.id,
        condicionLaboral: condicion,
        cargaLaboral: Number(cargaHoraria),
        // La escala magisterial no se edita en esta pantalla, así que sólo se
        // reenvía si el docente ya tenía una. Antes se mandaba
        // `MAP_ROMAN_TO_INT[escala] || 1`, y como hoy la columna está vacía
        // para todos, cada asignación escribía una escala I que nadie declaró.
        escalaMagisterial: escalaANumero(elegido.escala) ?? undefined,
        institucionId: elegido.institucionId,
        secciones: elegido.secciones?.map((s) => ({ grado: s.grado, seccion: s.seccion })) ?? [],
      });

      if (respuesta.ok) {
        onAsignado();
        return;
      }

      setError(
        (respuesta.error as { message?: string })?.message ||
          `Error al asignar el cargo de ${cargo}.`,
      );
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Error al procesar la asignación.');
      console.error('Error al asignar el cargo:', err);
    } finally {
      setGuardando(false);
    }
  };

  return {
    candidatos,
    cargando,
    errorDeCarga,
    docenteId,
    setDocenteId,
    elegido,
    condicion,
    setCondicion,
    cargaHoraria,
    setCargaHoraria,
    guardando,
    error,
    asignar,
  };
}
