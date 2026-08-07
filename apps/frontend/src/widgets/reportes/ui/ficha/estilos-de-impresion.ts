/**
 * Hoja de estilos de la ficha impresa.
 *
 * Eran noventa líneas dentro del JSX de `FichaPrintable`, entre el encabezado
 * institucional y las tablas de datos. Vive acá porque es una hoja de estilos,
 * no maquetación: define el papel A4, el pie con la numeración de páginas y la
 * paleta de bordes que da el aspecto de documento oficial.
 */

export const ESTILOS_DE_IMPRESION = `
          @page {
            size: A4 portrait;
            margin: 14mm 15mm 16mm;
            @bottom-center {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 8px;
              color: #475569;
            }
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
          /* ── Paleta única de bordes/grises (aspecto formal, oficial) ── */
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 9.5px;
            table-layout: fixed;
          }
          .pdf-table td {
            border: 1px solid #334155;
            padding: 3.5px 5px;
            word-break: break-word;
            vertical-align: middle;
          }
          .pdf-table .bg-gray {
            background-color: #e2e8f0;
            font-weight: bold;
            color: #0f172a;
          }
          /* ── Jerarquía tipográfica en 3 niveles, mismo lenguaje visual ── */
          .pdf-doc-title {
            text-align: center;
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #0f172a;
            background-color: #e2e8f0;
            border: 1.5px solid #334155;
            padding: 5px 8px;
            margin-bottom: 12px;
          }
          .pdf-major-title {
            font-size: 11.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #ffffff;
            background-color: #334155;
            padding: 3px 8px;
            margin-top: 16px;
            margin-bottom: 8px;
          }
          .pdf-section-title {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 10px;
            color: #0f172a;
            background-color: #e2e8f0;
            border: 1px solid #334155;
            padding: 2.5px 6px;
            margin-top: 10px;
            margin-bottom: 5px;
            letter-spacing: 0.03em;
          }
          /* Bloque formal (reemplaza las tarjetas redondeadas) */
          .pdf-block {
            border: 1px solid #334155;
            padding: 8px 10px;
          }
          /* Viñeta circular: hueca por defecto, rellena si el aspecto se cumplió */
          .pdf-bullet {
            display: inline-block;
            width: 8px;
            height: 8px;
            border: 1.2px solid #334155;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .pdf-bullet.checked {
            background-color: #334155;
          }
        `;
