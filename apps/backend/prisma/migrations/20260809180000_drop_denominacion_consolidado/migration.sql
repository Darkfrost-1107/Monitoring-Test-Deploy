-- Retira el segundo nombre por nivel.
--
-- Se agregó para que el instrumento directivo pudiera rotular distinto la marca
-- de cada rúbrica y el resultado consolidado. Al quitarse la columna «Nombre del
-- resultado» de la pantalla de registro el campo dejó de ser editable, y la
-- escala directiva por defecto pasó a proponer directamente los nombres del
-- consolidado —En inicio, En proceso, Logrado, Satisfactorio— que son los que
-- distinguen ese instrumento del docente.
--
-- Sin nadie que lo escriba ni lo lea, la columna sólo confunde a quien la
-- encuentre. Si alguna vez hacen falta los dos nombres, se vuelve a agregar.

ALTER TABLE "niveles_calificacion"
    DROP COLUMN IF EXISTS "denominacion_consolidado";
