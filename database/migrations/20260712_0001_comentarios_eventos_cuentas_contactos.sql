CREATE TABLE IF NOT EXISTS comentarios_db (
  id_comentario text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  id_original_autor text NOT NULL DEFAULT '',
  id_last_editor text NOT NULL DEFAULT '',
  tipo_entidad text NOT NULL,
  id_entidad text NOT NULL,
  contenido_comentario text NOT NULL DEFAULT ''
);

DO $$
BEGIN
  IF to_regclass('public.comentarios_cuentas_db') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO comentarios_db (
        id_comentario,
        created_at,
        updated_at,
        id_original_autor,
        id_last_editor,
        tipo_entidad,
        id_entidad,
        contenido_comentario
      )
      SELECT
        id_comentario_cuenta,
        COALESCE(fecha_comentario, created_at, now()),
        COALESCE(updated_at, fecha_comentario, created_at, now()),
        COALESCE(id_autor, ''),
        COALESCE(id_autor, ''),
        'cuenta',
        COALESCE(id_cuenta, ''),
        COALESCE(contenido_comentario, '')
      FROM comentarios_cuentas_db
      ON CONFLICT (id_comentario) DO NOTHING
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.comentarios_contactos_db') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO comentarios_db (
        id_comentario,
        created_at,
        updated_at,
        id_original_autor,
        id_last_editor,
        tipo_entidad,
        id_entidad,
        contenido_comentario
      )
      SELECT
        id_comentario_contacto,
        COALESCE(fecha_comentario, created_at, now()),
        COALESCE(updated_at, fecha_comentario, created_at, now()),
        COALESCE(id_autor, ''),
        COALESCE(id_autor, ''),
        'contacto',
        COALESCE(id_contacto, ''),
        COALESCE(contenido_comentario, '')
      FROM comentarios_contactos_db
      ON CONFLICT (id_comentario) DO NOTHING
    $sql$;
  END IF;
END $$;

DROP TABLE IF EXISTS comentarios_cuentas_db;
DROP TABLE IF EXISTS comentarios_contactos_db;

CREATE INDEX IF NOT EXISTS comentarios_db_entidad_idx ON comentarios_db (tipo_entidad, id_entidad, created_at DESC);

CREATE TABLE IF NOT EXISTS cuentas_registro_eventos (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  id_agente text NOT NULL DEFAULT '',
  id_cuenta text NOT NULL,
  detalles text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS comentarios_registro_eventos (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  id_agente text NOT NULL DEFAULT '',
  id_contacto text NOT NULL,
  detalles text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS cuentas_registro_eventos_cuenta_idx ON cuentas_registro_eventos (id_cuenta, created_at DESC);
CREATE INDEX IF NOT EXISTS comentarios_registro_eventos_contacto_idx ON comentarios_registro_eventos (id_contacto, created_at DESC);

ALTER TABLE cuentas_db
  ADD COLUMN IF NOT EXISTS suscriptor_revista boolean NOT NULL DEFAULT false;
