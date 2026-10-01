ALTER TABLE tesoreria_cargos_recurrentes
  ADD COLUMN IF NOT EXISTS banco_pago text
  CHECK (banco_pago IN ('Sabadell', 'Santander'));
ALTER TABLE comercial_contratos
  ADD COLUMN IF NOT EXISTS condiciones_intercambio text NOT NULL DEFAULT '';
