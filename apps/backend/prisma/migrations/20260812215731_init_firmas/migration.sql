-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "firma_url" TEXT;

-- CreateTable
CREATE TABLE "ficha_firmas" (
    "id" UUID NOT NULL,
    "ficha_id" UUID NOT NULL,
    "firmante_id" UUID NOT NULL,
    "rol_firmante" VARCHAR(20) NOT NULL,
    "imagen_url" TEXT,
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ficha_firmas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ficha_firmas_ficha_id_rol_firmante_key" ON "ficha_firmas"("ficha_id", "rol_firmante");

-- AddForeignKey
ALTER TABLE "ficha_firmas" ADD CONSTRAINT "ficha_firmas_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas_monitoreo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_firmas" ADD CONSTRAINT "ficha_firmas_firmante_id_fkey" FOREIGN KEY ("firmante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
