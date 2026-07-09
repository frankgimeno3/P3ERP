BEGIN;

ALTER TABLE publicaciones_db
  ADD COLUMN IF NOT EXISTS num_paginas INTEGER NOT NULL DEFAULT 0 CHECK (num_paginas >= 0);

CREATE TABLE IF NOT EXISTS publicaciones_paginas_db (
  id_pagina_publicacion TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL,
  pagina_actual INTEGER NOT NULL,
  has_content BOOLEAN NOT NULL DEFAULT FALSE,
  id_contenido TEXT,
  id_cuenta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (publication_id, pagina_actual)
);

CREATE INDEX IF NOT EXISTS publicaciones_paginas_publication_idx
  ON publicaciones_paginas_db (publication_id, pagina_actual);

COMMIT;
