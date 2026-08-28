import { useEffect, useState } from 'react';
import { requestBlob } from '@shared/config/api';
import { rutaDeDescarga } from '@shared/lib/archivo-guardado';

/**
 * Una imagen guardada en el servidor, traída con la sesión de quien mira.
 *
 * ── Por qué no alcanza un `<img src>` ──
 * Las rutas que guarda el backend son relativas al cajón, de modo que el
 * navegador las resolvía contra el FRONTEND: ni nginx ni Vite reenvían esas
 * rutas, así que la imagen salía rota. Y desde que los archivos exigen sesión,
 * un `src` directo tampoco bastaría en un despliegue donde la API vive en otro
 * origen y la cookie no viaja sola.
 *
 * Se trae el contenido y se muestra desde memoria. La URL temporal se libera al
 * desmontar: cada `createObjectURL` retiene el blob hasta que se revoca, y una
 * ficha con ocho evidencias las iría acumulando en cada apertura.
 *
 * ── Las evidencias generales no son archivos ──
 * Se guardan como `data:` en la propia columna de la ficha, no en `uploads/`.
 * Esas se muestran tal cual: no hay nada que pedir, y tratarlas como ruta las
 * dejaría en «no disponible» siendo que se ven perfectamente.
 */

interface Props {
  /** Ruta tal como la guardó el backend. */
  url: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ImagenConSesion({ url, alt, className, style }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  // Una imagen embebida se muestra sin pedir nada.
  const embebida = typeof url === 'string' && url.startsWith('data:');
  const ruta = embebida ? null : rutaDeDescarga(url);

  useEffect(() => {
    if (!ruta) return;

    let objectUrl: string | null = null;
    let vigente = true;

    requestBlob(ruta)
      .then((blob) => {
        // Si el componente se desmontó mientras llegaba, se libera en el acto
        // en lugar de guardar una URL que nadie va a revocar.
        objectUrl = URL.createObjectURL(blob);
        if (!vigente) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });

    return () => {
      vigente = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ruta]);

  if (embebida) {
    return <img src={url as string} alt={alt} className={className} style={style} />;
  }

  // Una imagen que no se pudo traer se dice; un hueco mudo deja a quien lee sin
  // saber si el docente no adjuntó nada o si falló la descarga.
  if (!ruta || fallo) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 text-[9px] text-slate-400 ${className ?? ''}`}
        style={style}
        role="img"
        aria-label={`${alt} — no disponible`}
      >
        Imagen no disponible
      </div>
    );
  }

  if (!blobUrl) {
    return <div className={className} style={style} aria-busy="true" />;
  }

  return <img src={blobUrl} alt={alt} className={className} style={style} />;
}
