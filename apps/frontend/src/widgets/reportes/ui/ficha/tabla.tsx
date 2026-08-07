import type { ReactNode } from 'react';

/**
 * Piezas de las tablas de la ficha impresa.
 *
 * Los `colgroup` de seis y ocho columnas estaban escritos a mano seis veces,
 * con el mismo ancho repetido en cada `col`.
 */

/** Tabla de la ficha, con sus columnas de ancho uniforme. */
export const TablaDeFicha = ({
  columnas,
  children,
  style,
}: {
  columnas: number;
  children: ReactNode;
  style?: React.CSSProperties;
}) => {
  const ancho = `${(100 / columnas).toFixed(3)}%`;

  return (
    <table className="pdf-table table-fixed w-full" style={style}>
      <colgroup>
        {Array.from({ length: columnas }, (_, i) => (
          <col key={i} style={{ width: ancho }} />
        ))}
      </colgroup>
      <tbody>{children}</tbody>
    </table>
  );
};

/** Rótulo de un campo. */
export const Rotulo = ({ children, colSpan }: { children: ReactNode; colSpan?: number }) => (
  <td className="bg-gray" colSpan={colSpan}>
    {children}
  </td>
);

/** Casilla que se marca con X según una condición. */
export const Casilla = ({ marcada }: { marcada: boolean }) => <td>{marcada ? 'X' : ''}</td>;

export const TituloDeSeccion = ({ children }: { children: ReactNode }) => (
  <div className="pdf-section-title">{children}</div>
);
