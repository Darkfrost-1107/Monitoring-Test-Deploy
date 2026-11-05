-- CreateTable
CREATE TABLE "operaciones_excepcionales" (
    "id" UUID NOT NULL,
    "cronograma_id" UUID NOT NULL,
    "ficha_id" UUID,
    "tipo_accion" VARCHAR(50) NOT NULL,
    "numero_expediente" VARCHAR(100) NOT NULL,
    "motivo" TEXT NOT NULL,
    "archivo_sustento_url" VARCHAR(500) NOT NULL,
    "ejecutado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operaciones_excepcionales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operaciones_excepcionales_cronograma_id_idx" ON "operaciones_excepcionales"("cronograma_id");

-- CreateIndex
CREATE INDEX "operaciones_excepcionales_ejecutado_por_id_idx" ON "operaciones_excepcionales"("ejecutado_por_id");

-- AddForeignKey
ALTER TABLE "operaciones_excepcionales" ADD CONSTRAINT "operaciones_excepcionales_cronograma_id_fkey" FOREIGN KEY ("cronograma_id") REFERENCES "cronogramas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operaciones_excepcionales" ADD CONSTRAINT "operaciones_excepcionales_ejecutado_por_id_fkey" FOREIGN KEY ("ejecutado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
