ALTER TABLE tesoreria_cargos_recurrentes DROP CONSTRAINT IF EXISTS cargos_recurrentes_destinatario_check;
ALTER TABLE tesoreria_cargos_recurrentes ADD CONSTRAINT cargos_recurrentes_destinatario_check CHECK (
  (tipo_cargo='proveedor' AND id_agente IS NULL)
  OR (tipo_cargo='nomina' AND id_agente IS NOT NULL AND id_proveedor IS NULL)
  OR (tipo_cargo='otro' AND id_agente IS NULL AND id_proveedor IS NULL)
);
