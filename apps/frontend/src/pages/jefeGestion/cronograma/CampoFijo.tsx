/**
 * Campo de sólo lectura, para lo que el perfil del usuario no elige.
 *
 * El formulario guarda identificadores, así que el valor a mostrar sale de la
 * etiqueta de la opción correspondiente: enseñar un UUID no le dice nada a
 * nadie.
 */

const CLASES =
  'bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-lg text-sm shadow-inner leading-none h-10 flex items-center';

export const CampoFijo = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-text-muted">{etiqueta}</label>
    <div className={CLASES}>{valor}</div>
  </div>
);
