ALTER TABLE tesoreria_pagos_previstos ADD COLUMN IF NOT EXISTS id_vencimiento text;
CREATE UNIQUE INDEX IF NOT EXISTS invoice_payment_occurrence_unique ON tesoreria_pagos_previstos(id_vencimiento) WHERE id_vencimiento IS NOT NULL;
