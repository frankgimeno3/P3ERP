BEGIN;
ALTER TABLE tesoreria_tarjetas ADD COLUMN IF NOT EXISTS referencia_extracto TEXT;
ALTER TABLE tesoreria_tarjetas_liquidaciones ADD COLUMN IF NOT EXISTS mes_extracto DATE;
CREATE UNIQUE INDEX IF NOT EXISTS tarjeta_mes_extracto_unico ON tesoreria_tarjetas_liquidaciones(id_tarjeta,mes_extracto) WHERE estado<>'anulada' AND mes_extracto IS NOT NULL;
ALTER TABLE laboral_anticipos ADD COLUMN IF NOT EXISTS fecha_prevista DATE,
 ADD COLUMN IF NOT EXISTS banco_pago TEXT CHECK(banco_pago IN ('Sabadell','Santander','Sin asignar'));
COMMENT ON COLUMN tesoreria_tarjetas.referencia_extracto IS 'Identificador bancario del contrato Santander o cliente PASS; identifica el PDF sin confundir los dígitos de la cuenta con los de la tarjeta.';
COMMENT ON COLUMN tesoreria_tarjetas_liquidaciones.mes_extracto IS 'Mes del cierre del extracto, distinto del mes de cargo. Evita importar dos veces una tarjeta y mes.';
COMMENT ON COLUMN laboral_anticipos.fecha_prevista IS 'Fecha de pago puntual del anticipo de nómina; no genera recurrencias.';
COMMENT ON COLUMN laboral_anticipos.banco_pago IS 'Banco de salida previsto del anticipo; se proyecta separado de la nómina, sin duplicar su importe.';
COMMIT;
