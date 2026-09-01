ALTER TABLE propuestas_db
  ADD COLUMN IF NOT EXISTS base_imponible_personalizada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS importe_base_personalizada numeric,
  ADD COLUMN IF NOT EXISTS es_intercambio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condiciones_intercambio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS intercambio_precio_final boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intercambio_transferencias boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_pago_proporcion3 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_pago_contraparte text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS importe_intercambio numeric NOT NULL DEFAULT 0;

ALTER TABLE lineas_propuestas_db
  ADD COLUMN IF NOT EXISTS especificaciones_linea text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS modo_precio text NOT NULL DEFAULT 'calculado',
  ADD COLUMN IF NOT EXISTS precio_total_personalizado numeric,
  ADD COLUMN IF NOT EXISTS id_pagina_publicacion text NOT NULL DEFAULT '';
