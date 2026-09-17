BEGIN;

-- Keep the old relation as an automatically updatable view while deployed code
-- still refers to its historical (misleading) name.
ALTER TABLE comentarios_registro_eventos RENAME TO contactos_registro_eventos;
CREATE VIEW comentarios_registro_eventos AS
SELECT id, created_at, event_type, id_agente, id_contacto, detalles
FROM contactos_registro_eventos;

COMMIT;
