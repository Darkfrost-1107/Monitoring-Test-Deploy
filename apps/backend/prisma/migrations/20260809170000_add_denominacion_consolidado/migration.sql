-- Nombre del resultado global, cuando el instrumento lo llama distinto que la
-- marca individual.
--
-- La rúbrica de monitoreo DIRECTIVO 2025 usa dos vocabularios: su tabla
-- «NIVELES DEL LOGRO» nombra la marca de cada rúbrica —Inicio, En Proceso,
-- Logro Esperado, Logro Destacado— y el baremo del consolidado nombra el
-- resultado del mismo tramo —En inicio, En proceso, Logrado, Satisfactorio—.
--
-- Con una sola columna, uno de los dos siempre quedaba mal rotulado. La rúbrica
-- DOCENTE usa las mismas palabras en ambas capas, de modo que deja esta columna
-- nula y el resultado reutiliza `denominacion`.

ALTER TABLE "niveles_calificacion"
    ADD COLUMN "denominacion_consolidado" VARCHAR(100);
