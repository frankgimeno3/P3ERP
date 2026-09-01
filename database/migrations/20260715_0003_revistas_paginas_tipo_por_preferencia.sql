ALTER TABLE revistas_paginas_db
  ADD COLUMN IF NOT EXISTS pagina_preferente TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT '';

UPDATE revistas_paginas_db
SET tipo = CASE
  WHEN pagina_preferente = 'portada' THEN 'Portada'
  WHEN pagina_preferente = 'indice' THEN 'Indice'
  WHEN pagina_preferente = 'sumario' THEN 'Sumario'
  WHEN pagina_preferente = 'interior_portada' THEN 'Interior portada'
  WHEN pagina_preferente LIKE 'pag_pref_%' THEN 'Anuncio'
  ELSE tipo
END,
updated_at = NOW()
WHERE pagina_preferente IN ('portada', 'indice', 'sumario', 'interior_portada')
   OR pagina_preferente LIKE 'pag_pref_%';
