BEGIN;

-- INSERT ... RETURNING * on a compatibility view must expose the same defaults
-- as the former table, even though the trigger already stores them correctly.
ALTER VIEW cuentas_registro_eventos ALTER COLUMN created_at SET DEFAULT now();
ALTER VIEW cuentas_registro_eventos ALTER COLUMN id_agente SET DEFAULT '';
ALTER VIEW cuentas_registro_eventos ALTER COLUMN detalles SET DEFAULT '';
ALTER VIEW contactos_registro_eventos ALTER COLUMN created_at SET DEFAULT now();
ALTER VIEW contactos_registro_eventos ALTER COLUMN id_agente SET DEFAULT '';
ALTER VIEW contactos_registro_eventos ALTER COLUMN detalles SET DEFAULT '';
ALTER VIEW comentarios_registro_eventos ALTER COLUMN created_at SET DEFAULT now();
ALTER VIEW comentarios_registro_eventos ALTER COLUMN id_agente SET DEFAULT '';
ALTER VIEW comentarios_registro_eventos ALTER COLUMN detalles SET DEFAULT '';

COMMIT;
