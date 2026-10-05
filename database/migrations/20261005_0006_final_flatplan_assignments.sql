CREATE TABLE IF NOT EXISTS contenidos_revistas_db (
  contenido_revista_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revista_id text NOT NULL REFERENCES servicios_revistas(id_revista) ON DELETE CASCADE,
  contenido_id text NOT NULL REFERENCES produccion_contenidos(id_contenido) ON DELETE CASCADE,
  numero_pagina integer NOT NULL CHECK(numero_pagina>=-1),
  tipo_pagina text NOT NULL DEFAULT '',
  pagina_del_contenido integer NOT NULL DEFAULT 1 CHECK(pagina_del_contenido>0),
  UNIQUE(revista_id,numero_pagina)
);
CREATE INDEX IF NOT EXISTS contenidos_revistas_db_contenido_id_idx ON contenidos_revistas_db(contenido_id);
