BEGIN;

ALTER TABLE publicaciones_paginas_db
  ADD COLUMN IF NOT EXISTS ordinal TEXT NOT NULL DEFAULT '1/1';

UPDATE publicaciones_paginas_db
SET ordinal = '1/1'
WHERE COALESCE(ordinal, '') = '';

COMMIT;
