-- Additive migration. Existing and future agents are employee accounts by default.
ALTER TABLE agentes_db ADD COLUMN IF NOT EXISTS is_empleado_account BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS anticipos_empleados (
  id TEXT PRIMARY KEY,
  id_empleado TEXT NOT NULL REFERENCES agentes_db(id_agente),
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  importe_neto NUMERIC(12,2) NOT NULL CHECK (importe_neto > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pagado','pendiente')),
  comentarios TEXT NOT NULL DEFAULT '',
  id_transferencia TEXT UNIQUE REFERENCES lineas_bancos(id_linea_banco),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS anticipos_empleados_periodo_idx ON anticipos_empleados(id_empleado,anio,mes);

CREATE TABLE IF NOT EXISTS nominas (
  id TEXT PRIMARY KEY,
  id_empleado TEXT NOT NULL REFERENCES agentes_db(id_agente),
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pagado','pendiente')),
  importe_neto NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (importe_neto >= 0),
  anticipos TEXT[] NOT NULL DEFAULT '{}',
  id_transferencia TEXT UNIQUE REFERENCES lineas_bancos(id_linea_banco),
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id_empleado,anio,mes)
);
CREATE INDEX IF NOT EXISTS nominas_anticipos_idx ON nominas USING GIN(anticipos);

CREATE TABLE IF NOT EXISTS calendarios_laborales (
  anio SMALLINT PRIMARY KEY CHECK (anio BETWEEN 2000 AND 2100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS eventos_calendario_laboral (
  id TEXT PRIMARY KEY,
  anio SMALLINT NOT NULL REFERENCES calendarios_laborales(anio),
  tipo TEXT NOT NULL CHECK (tipo IN ('vacaciones','festivo_nacional','festivo_autonomico','festivo_barcelona','festivo_convenio','deadline_revista','publicacion_revista','feria')),
  titulo TEXT NOT NULL CHECK (length(btrim(titulo)) > 0),
  inicio DATE NOT NULL,
  fin DATE NOT NULL,
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fin >= inicio AND EXTRACT(YEAR FROM inicio) = anio AND EXTRACT(YEAR FROM fin) = anio)
);
CREATE INDEX IF NOT EXISTS eventos_calendario_laboral_anio_idx ON eventos_calendario_laboral(anio,inicio);

CREATE TABLE IF NOT EXISTS empleados_libre_disposicion (
  id_empleado TEXT NOT NULL REFERENCES agentes_db(id_agente),
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  numero SMALLINT NOT NULL CHECK (numero BETWEEN 1 AND 3),
  fecha DATE NOT NULL CHECK (EXTRACT(YEAR FROM fecha) = anio),
  PRIMARY KEY(id_empleado,anio,numero),
  UNIQUE(id_empleado,fecha)
);
CREATE TABLE IF NOT EXISTS ausencias_empleados (
  id TEXT PRIMARY KEY,
  id_empleado TEXT NOT NULL REFERENCES agentes_db(id_agente),
  tipo TEXT NOT NULL,
  inicio DATE NOT NULL,
  fin DATE NOT NULL CHECK (fin >= inicio),
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ausencias_empleados_empleado_idx ON ausencias_empleados(id_empleado,inicio);
CREATE TABLE IF NOT EXISTS comentarios_empleados (
  id TEXT PRIMARY KEY,
  id_empleado TEXT NOT NULL REFERENCES agentes_db(id_agente),
  comentario TEXT NOT NULL CHECK (length(btrim(comentario)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comentarios_empleados_empleado_idx ON comentarios_empleados(id_empleado,created_at);

CREATE TABLE IF NOT EXISTS procesos_contratacion (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  oferta_condiciones TEXT NOT NULL DEFAULT '',
  mensaje_pre_llamada TEXT NOT NULL DEFAULT '',
  mensaje_post_llamada TEXT NOT NULL DEFAULT '',
  mensaje_rechazo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS candidatos_contratacion (
  id TEXT PRIMARY KEY,
  id_proceso TEXT NOT NULL REFERENCES procesos_contratacion(id),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  resumen_cv TEXT NOT NULL DEFAULT '',
  comentarios TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente llamada' CHECK (estado IN ('pendiente llamada','rechazado en llamada','pendiente reunión presencial','rechazado en reunión presencial','elegido','reserva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS candidatos_contratacion_proceso_idx ON candidatos_contratacion(id_proceso);

CREATE TABLE IF NOT EXISTS documentos_laborales (
  id TEXT PRIMARY KEY,
  id_empleado TEXT REFERENCES agentes_db(id_agente),
  id_nomina TEXT REFERENCES nominas(id),
  id_anticipo TEXT REFERENCES anticipos_empleados(id),
  nombre TEXT NOT NULL,
  content_type TEXT NOT NULL,
  tamano INTEGER NOT NULL CHECK (tamano > 0 AND tamano <= 15728640),
  s3_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (num_nonnulls(id_empleado,id_nomina,id_anticipo) = 1)
);
CREATE INDEX IF NOT EXISTS documentos_laborales_empleado_idx ON documentos_laborales(id_empleado);
CREATE INDEX IF NOT EXISTS documentos_laborales_nomina_idx ON documentos_laborales(id_nomina);
CREATE INDEX IF NOT EXISTS documentos_laborales_anticipo_idx ON documentos_laborales(id_anticipo);

UPDATE roles_db SET permisos_rol = (
  SELECT jsonb_agg(DISTINCT permiso) FROM jsonb_array_elements(
    COALESCE(permisos_rol, '[]'::jsonb) || '["/dashboard/direccion/laboral/nominas","/dashboard/direccion/laboral/asuntos-empleados","/dashboard/direccion/laboral/calendario-laboral","/dashboard/direccion/laboral/contratacion"]'::jsonb
  ) AS p(permiso)
), updated_at = NOW() WHERE id_rol = 'superadmin';
