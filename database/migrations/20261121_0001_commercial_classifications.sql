CREATE TABLE IF NOT EXISTS operaciones_clasificaciones (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 clase text NOT NULL CHECK (clase IN ('actividades-cuentas','tipos-contacto')),
 nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 200),
 UNIQUE (clase,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS operaciones_clasificaciones_nombre ON operaciones_clasificaciones (clase, lower(regexp_replace(btrim(nombre),'\s+',' ','g')));
CREATE TABLE IF NOT EXISTS comercial_cuenta_actividades (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_cuenta text NOT NULL REFERENCES comercial_cuentas(id_cuenta) ON UPDATE CASCADE ON DELETE CASCADE,
 clase text GENERATED ALWAYS AS ('actividades-cuentas'::text) STORED,
 id_clasificacion bigint NOT NULL,
 FOREIGN KEY (clase,id_clasificacion) REFERENCES operaciones_clasificaciones(clase,id) ON DELETE CASCADE,
 UNIQUE (id_cuenta,id_clasificacion)
);
CREATE TABLE IF NOT EXISTS comercial_contacto_tipos (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_contacto text NOT NULL REFERENCES comercial_contactos(id_contacto) ON UPDATE CASCADE ON DELETE CASCADE,
 clase text GENERATED ALWAYS AS ('tipos-contacto'::text) STORED,
 id_clasificacion bigint NOT NULL,
 FOREIGN KEY (clase,id_clasificacion) REFERENCES operaciones_clasificaciones(clase,id) ON DELETE CASCADE,
 UNIQUE (id_contacto,id_clasificacion)
);
CREATE INDEX IF NOT EXISTS comercial_cuenta_actividades_clasificacion ON comercial_cuenta_actividades(id_clasificacion);
CREATE INDEX IF NOT EXISTS comercial_contacto_tipos_clasificacion ON comercial_contacto_tipos(id_clasificacion);
ALTER TABLE comercial_cuentas ADD COLUMN IF NOT EXISTS seguimiento_qq text NOT NULL DEFAULT '';
ALTER TABLE comercial_cuentas ADD COLUMN IF NOT EXISTS canal_youtube text NOT NULL DEFAULT '';
SELECT public.p3_install_user_event_triggers();
