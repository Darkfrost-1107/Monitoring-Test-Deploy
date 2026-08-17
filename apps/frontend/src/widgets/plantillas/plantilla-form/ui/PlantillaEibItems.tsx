import { useState } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  FolderPlus,
  PlusCircle,
  GraduationCap,
  FileCheck2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { SectionCard } from '@shared/ui/form-controls';
import type { Desempeno } from '@entities/model-plantillas';

type TipoEscalaEib = 'AULA' | 'DOCUMENTAL' | 'PERSONALIZADA';

interface DescriptoresEscalaEib {
  si: string;
  parcialmente: string;
  no: string;
}

interface ItemEib {
  id: string;
  texto: string;
}

interface SubcriterioEib {
  id: string;
  subcriterio: string; // Ej. "2.1. Interacciones pedagógicas en el aula" o ""
  items: ItemEib[];
}

interface SeccionEib {
  id: string;
  seccion: string; // Ej. "II. DESARROLLO DE LA PLANIFICACIÓN A CORTO PLAZO"
  tipoEscala: TipoEscalaEib;
  descriptores: DescriptoresEscalaEib;
  subcriterios: SubcriterioEib[];
}

interface Props {
  criterios: Desempeno[];
  onChange: (criterios: Desempeno[]) => void;
}

const ESCALAS_PRESET: Record<'AULA' | 'DOCUMENTAL', DescriptoresEscalaEib> = {
  AULA: {
    si: 'El criterio se evidencia en el aula de forma clara, consistente y oportuna.',
    parcialmente: 'El criterio aparece de manera parcial, incipiente o con necesidad de acompañamiento.',
    no: 'No se observa evidencia de la práctica durante la sesión.',
  },
  DOCUMENTAL: {
    si: 'El criterio se evidencia de forma clara, consistente y alineada con el MSEIB.',
    parcialmente: 'El criterio aparece parcialmente o con indicios, pero requiere ajustes o fortalecimiento.',
    no: 'No se evidencia el criterio en el documento analizado.',
  },
};

/** Determina el tipo de escala y descriptores a partir de la rúbrica de un desempeño existente */
function inferirEscala(
  seccionNombre: string,
  primerDesempeno?: Desempeno,
): { tipoEscala: TipoEscalaEib; descriptores: DescriptoresEscalaEib } {
  const esDocPorNombre =
    seccionNombre.toUpperCase().includes('PLANIFICACIÓN') ||
    seccionNombre.toUpperCase().includes('PLANIFICACION') ||
    seccionNombre.toUpperCase().includes('DOCUMENTO') ||
    seccionNombre.trim().startsWith('III');

  const presetDefault = esDocPorNombre ? ESCALAS_PRESET.DOCUMENTAL : ESCALAS_PRESET.AULA;

  if (!primerDesempeno || !primerDesempeno.rubrica || primerDesempeno.rubrica.length === 0) {
    return {
      tipoEscala: esDocPorNombre ? 'DOCUMENTAL' : 'AULA',
      descriptores: { ...presetDefault },
    };
  }

  const rubNo = primerDesempeno.rubrica.find((r) => r.nivel === 'I')?.descripcion?.trim();
  const rubParcial = primerDesempeno.rubrica.find((r) => r.nivel === 'II')?.descripcion?.trim();
  const rubSi = primerDesempeno.rubrica.find((r) => r.nivel === 'III')?.descripcion?.trim();

  // Si no tiene texto real o solo dice "Sí"/"No", usar el preset correspondiente
  if (!rubNo || rubNo === 'No' || !rubSi || rubSi === 'Sí') {
    return {
      tipoEscala: esDocPorNombre ? 'DOCUMENTAL' : 'AULA',
      descriptores: { ...presetDefault },
    };
  }

  // Verificar si coincide con alguno de los presets
  if (
    rubSi === ESCALAS_PRESET.AULA.si &&
    rubParcial === ESCALAS_PRESET.AULA.parcialmente &&
    rubNo === ESCALAS_PRESET.AULA.no
  ) {
    return { tipoEscala: 'AULA', descriptores: { ...ESCALAS_PRESET.AULA } };
  }

  if (
    rubSi === ESCALAS_PRESET.DOCUMENTAL.si &&
    rubParcial === ESCALAS_PRESET.DOCUMENTAL.parcialmente &&
    rubNo === ESCALAS_PRESET.DOCUMENTAL.no
  ) {
    return { tipoEscala: 'DOCUMENTAL', descriptores: { ...ESCALAS_PRESET.DOCUMENTAL } };
  }

  // Es una descripción personalizada por el usuario
  return {
    tipoEscala: 'PERSONALIZADA',
    descriptores: {
      si: rubSi || presetDefault.si,
      parcialmente: rubParcial || presetDefault.parcialmente,
      no: rubNo || presetDefault.no,
    },
  };
}

/** Transforma la lista plana de desempeños en la estructura jerárquica de Secciones -> Subcriterios -> Ítems */
function desempanosABloques(criterios: Desempeno[]): SeccionEib[] {
  if (!criterios || criterios.length === 0) {
    return [
      {
        id: crypto.randomUUID(),
        seccion: 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE',
        tipoEscala: 'AULA',
        descriptores: { ...ESCALAS_PRESET.AULA },
        subcriterios: [
          {
            id: crypto.randomUUID(),
            subcriterio: '',
            items: [{ id: crypto.randomUUID(), texto: '' }],
          },
        ],
      },
    ];
  }

  const secciones: SeccionEib[] = [];
  let currentSeccion: SeccionEib | null = null;
  let currentSubcriterio: SubcriterioEib | null = null;
  let currentSubKey = '';

  for (const c of criterios) {
    const rawKey = c.descripcionCorta?.trim() || 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE';
    const partes = rawKey.includes(' — ')
      ? rawKey.split(' — ')
      : rawKey.includes('\n')
        ? rawKey.split('\n')
        : rawKey.includes(' - ')
          ? rawKey.split(' - ')
          : [rawKey];
    const seccionNombre = (partes[0] || rawKey).trim();
    const subcriterioNombre = partes.length > 1 ? partes.slice(1).join(' — ').trim() : '';

    if (!currentSeccion || currentSeccion.seccion !== seccionNombre) {
      const escala = inferirEscala(seccionNombre, c);
      currentSeccion = {
        id: crypto.randomUUID(),
        seccion: seccionNombre,
        tipoEscala: escala.tipoEscala,
        descriptores: escala.descriptores,
        subcriterios: [],
      };
      secciones.push(currentSeccion);
      currentSubcriterio = null;
      currentSubKey = '';
    }

    if (!currentSubcriterio || currentSubKey !== subcriterioNombre) {
      currentSubKey = subcriterioNombre;
      currentSubcriterio = {
        id: crypto.randomUUID(),
        subcriterio: subcriterioNombre,
        items: [],
      };
      currentSeccion.subcriterios.push(currentSubcriterio);
    }

    currentSubcriterio.items.push({
      id: c.id,
      texto: c.nombre,
    });
  }

  return secciones.length > 0
    ? secciones
    : [
        {
          id: crypto.randomUUID(),
          seccion: 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE',
          tipoEscala: 'AULA',
          descriptores: { ...ESCALAS_PRESET.AULA },
          subcriterios: [
            {
              id: crypto.randomUUID(),
              subcriterio: '',
              items: [{ id: crypto.randomUUID(), texto: '' }],
            },
          ],
        },
      ];
}

/** Convierte la estructura jerárquica en la lista plana que persiste el backend, inyectando las rúbricas configuradas */
function bloquesADesempenos(secciones: SeccionEib[]): Desempeno[] {
  const result: Desempeno[] = [];

  for (const sec of secciones) {
    const seccionTxt = sec.seccion.trim();
    const descActual =
      sec.tipoEscala === 'PERSONALIZADA'
        ? sec.descriptores
        : ESCALAS_PRESET[sec.tipoEscala];

    for (const sub of sec.subcriterios) {
      const subTxt = sub.subcriterio.trim();
      const etiqueta = subTxt
        ? seccionTxt
          ? `${seccionTxt} — ${subTxt}`
          : subTxt
        : seccionTxt;

      for (const item of sub.items) {
        result.push({
          id: item.id,
          nombre: item.texto,
          descripcionCorta: etiqueta,
          preguntaExtra: '',
          aspectos: [],
          rubrica: [
            { nivel: 'I', descripcion: descActual.no },
            { nivel: 'II', descripcion: descActual.parcialmente },
            { nivel: 'III', descripcion: descActual.si },
            { nivel: 'IV', descripcion: descActual.si },
          ],
        });
      }
    }
  }

  return result;
}

export const PlantillaEibItems = ({ criterios, onChange }: Props) => {
  const [secciones, setSecciones] = useState<SeccionEib[]>(() => desempanosABloques(criterios));

  // Notificar al padre cada vez que cambie la estructura interna
  const sincronizar = (nuevasSecciones: SeccionEib[]) => {
    setSecciones(nuevasSecciones);
    onChange(bloquesADesempenos(nuevasSecciones));
  };

  // --- Manejo de Secciones Principales ---
  const agregarSeccion = () => {
    const esTercera = secciones.length >= 2;
    const tipoEscala: TipoEscalaEib = esTercera ? 'DOCUMENTAL' : 'AULA';
    const nueva: SeccionEib = {
      id: crypto.randomUUID(),
      seccion: '',
      tipoEscala,
      descriptores: { ...ESCALAS_PRESET[tipoEscala] },
      subcriterios: [
        {
          id: crypto.randomUUID(),
          subcriterio: '',
          items: [{ id: crypto.randomUUID(), texto: '' }],
        },
      ],
    };
    sincronizar([...secciones, nueva]);
  };

  const eliminarSeccion = (seccionId: string) => {
    if (secciones.length <= 1) return;
    sincronizar(secciones.filter((s) => s.id !== seccionId));
  };

  const actualizarSeccionNombre = (seccionId: string, seccion: string) => {
    sincronizar(secciones.map((s) => (s.id === seccionId ? { ...s, seccion } : s)));
  };

  // --- Manejo de Escala Cualitativa por Sección ---
  const cambiarTipoEscala = (seccionId: string, tipoEscala: TipoEscalaEib) => {
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        const descriptores =
          tipoEscala === 'PERSONALIZADA'
            ? { ...s.descriptores }
            : { ...ESCALAS_PRESET[tipoEscala] };
        return {
          ...s,
          tipoEscala,
          descriptores,
        };
      }),
    );
  };

  const actualizarDescriptor = (
    seccionId: string,
    campo: keyof DescriptoresEscalaEib,
    valor: string,
  ) => {
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        return {
          ...s,
          tipoEscala: 'PERSONALIZADA',
          descriptores: {
            ...s.descriptores,
            [campo]: valor,
          },
        };
      }),
    );
  };

  // --- Manejo de Subcriterios ---
  const agregarSubcriterio = (seccionId: string) => {
    const nuevoSub: SubcriterioEib = {
      id: crypto.randomUUID(),
      subcriterio: '',
      items: [{ id: crypto.randomUUID(), texto: '' }],
    };
    sincronizar(
      secciones.map((s) =>
        s.id === seccionId ? { ...s, subcriterios: [...s.subcriterios, nuevoSub] } : s,
      ),
    );
  };

  const eliminarSubcriterio = (seccionId: string, subcriterioId: string) => {
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        if (s.subcriterios.length <= 1) return s;
        return {
          ...s,
          subcriterios: s.subcriterios.filter((sub) => sub.id !== subcriterioId),
        };
      }),
    );
  };

  const actualizarSubcriterioNombre = (
    seccionId: string,
    subcriterioId: string,
    subcriterio: string,
  ) => {
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        return {
          ...s,
          subcriterios: s.subcriterios.map((sub) =>
            sub.id === subcriterioId ? { ...sub, subcriterio } : sub,
          ),
        };
      }),
    );
  };

  // --- Manejo de Ítems ---
  const agregarItem = (seccionId: string, subcriterioId: string) => {
    const nuevoItem: ItemEib = {
      id: crypto.randomUUID(),
      texto: '',
    };
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        return {
          ...s,
          subcriterios: s.subcriterios.map((sub) =>
            sub.id === subcriterioId ? { ...sub, items: [...sub.items, nuevoItem] } : sub,
          ),
        };
      }),
    );
  };

  const eliminarItem = (seccionId: string, subcriterioId: string, itemId: string) => {
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        return {
          ...s,
          subcriterios: s.subcriterios.map((sub) => {
            if (sub.id !== subcriterioId) return sub;
            if (sub.items.length <= 1) return sub;
            return {
              ...sub,
              items: sub.items.filter((it) => it.id !== itemId),
            };
          }),
        };
      }),
    );
  };

  const actualizarItemTexto = (
    seccionId: string,
    subcriterioId: string,
    itemId: string,
    texto: string,
  ) => {
    sincronizar(
      secciones.map((s) => {
        if (s.id !== seccionId) return s;
        return {
          ...s,
          subcriterios: s.subcriterios.map((sub) => {
            if (sub.id !== subcriterioId) return sub;
            return {
              ...sub,
              items: sub.items.map((it) => (it.id === itemId ? { ...it, texto } : it)),
            };
          }),
        };
      }),
    );
  };

  const totalItems = secciones.reduce(
    (acc, s) => acc + s.subcriterios.reduce((subAcc, sub) => subAcc + sub.items.length, 0),
    0,
  );

  return (
    <SectionCard
      icon={<Layers className="w-5 h-5 text-primary" />}
      title="2. Estructura Jerárquica EIB: Secciones, Subcriterios e Ítems"
      headerRight={
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {secciones.length} {secciones.length === 1 ? 'Sección' : 'Secciones'}
          </span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {totalItems} {totalItems === 1 ? 'Ítem Total' : 'Ítems Totales'}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-xs text-text-muted leading-relaxed">
          Define las <strong>Secciones</strong> de la ficha, configura su <strong>Escala de Valoración</strong> y añade adentro todos los <strong>Subcriterios</strong> con sus respectivos ítems observables.
        </p>

        {/* Lista de Secciones Principales */}
        <div className="flex flex-col gap-6">
          {secciones.map((sec, indexSec) => (
            <div
              key={sec.id}
              className="rounded-2xl border-2 border-slate-200 bg-surface shadow-xs overflow-hidden transition-all hover:border-primary/40"
            >
              {/* Encabezado de la Sección Principal */}
              <div className="p-4 bg-slate-100/90 border-b border-slate-200 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 px-2.5 items-center justify-center rounded-md bg-primary text-[11px] font-black text-white shadow-xs">
                      SECCIÓN {indexSec + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {sec.subcriterios.length} {sec.subcriterios.length === 1 ? 'grupo' : 'grupos'}
                    </span>
                  </div>

                  {secciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarSeccion(sec.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar esta sección completa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar Sección</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    Título de la Sección o Dimensión Principal <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={sec.seccion}
                    onChange={(e) => actualizarSeccionNombre(sec.id, e.target.value)}
                    placeholder="Ej. II. DESARROLLO DE LA PLANIFICACIÓN A CORTO PLAZO"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none shadow-xs"
                    required
                  />
                </div>

                {/* Configurador de Escala de Calificación de la Sección */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Escala de Calificación de esta Sección:
                    </span>

                    {/* Selector de Presets / Personalizada */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => cambiarTipoEscala(sec.id, 'AULA')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                          sec.tipoEscala === 'AULA'
                            ? 'bg-white text-primary shadow-xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>Observación en Aula</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarTipoEscala(sec.id, 'DOCUMENTAL')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                          sec.tipoEscala === 'DOCUMENTAL'
                            ? 'bg-white text-primary shadow-xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        <span>Revisión Documental</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarTipoEscala(sec.id, 'PERSONALIZADA')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                          sec.tipoEscala === 'PERSONALIZADA'
                            ? 'bg-white text-primary shadow-xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Personalizada</span>
                      </button>
                    </div>
                  </div>

                  {/* Detalle o Edición de los Descriptores */}
                  {sec.tipoEscala === 'PERSONALIZADA' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      {/* Campo Sí */}
                      <div className="flex flex-col gap-1 bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Significado de "Sí":
                        </span>
                        <textarea
                          rows={2}
                          value={sec.descriptores.si}
                          onChange={(e) => actualizarDescriptor(sec.id, 'si', e.target.value)}
                          placeholder="Descripción para Sí..."
                          className="w-full rounded-md border border-emerald-300 bg-white p-1.5 text-[11px] text-slate-800 leading-tight focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-medium"
                          required
                        />
                      </div>

                      {/* Campo Parcialmente */}
                      <div className="flex flex-col gap-1 bg-amber-50/60 border border-amber-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Significado de "Parcialmente":
                        </span>
                        <textarea
                          rows={2}
                          value={sec.descriptores.parcialmente}
                          onChange={(e) => actualizarDescriptor(sec.id, 'parcialmente', e.target.value)}
                          placeholder="Descripción para Parcialmente..."
                          className="w-full rounded-md border border-amber-300 bg-white p-1.5 text-[11px] text-slate-800 leading-tight focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-medium"
                          required
                        />
                      </div>

                      {/* Campo No */}
                      <div className="flex flex-col gap-1 bg-rose-50/60 border border-rose-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-black text-rose-800 uppercase flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Significado de "No":
                        </span>
                        <textarea
                          rows={2}
                          value={sec.descriptores.no}
                          onChange={(e) => actualizarDescriptor(sec.id, 'no', e.target.value)}
                          placeholder="Descripción para No..."
                          className="w-full rounded-md border border-rose-300 bg-white p-1.5 text-[11px] text-slate-800 leading-tight focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none font-medium"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-0.5 text-[10.5px]">
                      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 flex items-start gap-1.5 text-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Sí:</strong> {ESCALAS_PRESET[sec.tipoEscala].si}</span>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 flex items-start gap-1.5 text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Parcialmente:</strong> {ESCALAS_PRESET[sec.tipoEscala].parcialmente}</span>
                      </div>
                      <div className="bg-rose-50/80 border border-rose-200/80 rounded-lg p-2 flex items-start gap-1.5 text-rose-900">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span><strong>No:</strong> {ESCALAS_PRESET[sec.tipoEscala].no}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subcriterios / Grupos dentro de la Sección */}
              <div className="p-4 flex flex-col gap-5 bg-slate-50/40">
                {sec.subcriterios.map((sub, indexSub) => (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col gap-3.5"
                  >
                    {/* Cabecera del Subcriterio */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <div className="flex-1 flex items-center gap-2.5">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
                          Subcriterio {indexSec + 1}.{indexSub + 1}:
                        </span>
                        <input
                          type="text"
                          value={sub.subcriterio}
                          onChange={(e) =>
                            actualizarSubcriterioNombre(sec.id, sub.id, e.target.value)
                          }
                          placeholder="Ej. 2.1. Interacciones pedagógicas en el aula (dejar vacío si no aplica)"
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      {sec.subcriterios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarSubcriterio(sec.id, sub.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                          title="Eliminar este subcriterio"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Ítems del Subcriterio */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Ítems Observables</span>
                        <span>Escala heredada: Sí | Parcialmente | No</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {sub.items.map((item, indexItem) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600">
                              {indexItem + 1}
                            </span>

                            <input
                              type="text"
                              value={item.texto}
                              onChange={(e) =>
                                actualizarItemTexto(sec.id, sub.id, item.id, e.target.value)
                              }
                              placeholder="Ej. El docente comunica el propósito de aprendizaje y los criterios de evaluación."
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-primary focus:outline-none shadow-2xs"
                              required
                            />

                            {sub.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarItem(sec.id, sub.id, item.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                                title="Eliminar ítem"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => agregarItem(sec.id, sub.id)}
                        className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-dashed border-primary/40 text-[11px] font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer mt-1 self-start"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Agregar Ítem</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Botón para añadir otro subcriterio a esta misma sección */}
                <button
                  type="button"
                  onClick={() => agregarSubcriterio(sec.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-primary/50 bg-white text-xs font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer shadow-2xs self-start"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+ Agregar Subcriterio a esta Sección</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Botón para añadir una nueva sección principal */}
        <button
          type="button"
          onClick={agregarSeccion}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-xs font-black text-primary hover:bg-primary/10 transition-colors cursor-pointer shadow-xs"
        >
          <FolderPlus className="h-4 w-4" />
          <span>+ Agregar Nueva Sección o Dimensión Principal EIB</span>
        </button>
      </div>
    </SectionCard>
  );
};
