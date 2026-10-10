-- Keep the invoice, forecast and real payment amounts; record only the accepted gap.
ALTER TABLE tesoreria_pagos_previstos ADD COLUMN IF NOT EXISTS cierre_pago jsonb;
