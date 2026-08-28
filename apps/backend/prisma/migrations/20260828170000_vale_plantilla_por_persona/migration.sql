-- El vale de plantilla nombra a la persona, no sólo al cargo.
--
-- Antes el vale declaraba únicamente el cargo destinatario, y lo consumía el
-- primero de ese cargo que entrara al sistema: una I.E. con dos coordinadores
-- pedagógicos recibía un cupo aprobado para uno y se lo llevaba el otro, sin
-- error y sin rastro. La intención del director vivía en una conversación.
--
-- La columna admite nulos a propósito: los vales anteriores a este campo siguen
-- valiendo para cualquiera de su cargo. Invalidar aprobaciones ya concedidas
-- sería peor que la imprecisión que arrastran.
ALTER TABLE "solicitud_plantilla_items"
  ADD COLUMN "beneficiario_id" UUID;

CREATE INDEX "solicitud_plantilla_items_beneficiario_id_idx"
  ON "solicitud_plantilla_items"("beneficiario_id");

-- RESTRICT y no CASCADE: borrar un usuario no debe llevarse por delante el
-- rastro de una autorización que la Jefatura concedió.
ALTER TABLE "solicitud_plantilla_items"
  ADD CONSTRAINT "solicitud_plantilla_items_beneficiario_id_fkey"
  FOREIGN KEY ("beneficiario_id") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
