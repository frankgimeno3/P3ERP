ALTER TABLE mediateca_carpetas ADD COLUMN IF NOT EXISTS access_path TEXT;
ALTER TABLE agentes_db ADD COLUMN IF NOT EXISTS cognito_emails JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE mediateca_carpetas SET access_path=CASE mediateca_folder_name
  WHEN 'documentos_administracion' THEN '/dashboard/administracion'
  WHEN 'documentos_direccion' THEN '/dashboard/direccion'
  WHEN 'documentos_produccion' THEN '/dashboard/produccion'
  WHEN 'contratos_firmados' THEN '/dashboard/comercial/contratos'
END WHERE mediateca_parent_folder_id IS NULL AND access_path IS NULL
  AND mediateca_folder_name IN ('documentos_administracion','documentos_direccion','documentos_produccion','contratos_firmados');
-- Replace the previous generated defaults with the live module policy.
-- Preserve any explicitly customized role restriction.
UPDATE mediateca_carpetas SET allowed_roles='[]'::jsonb
WHERE mediateca_parent_folder_id IS NULL AND (
 (mediateca_folder_name='documentos_administracion' AND allowed_roles='["administracion","operaciones","direccion","superadmin"]'::jsonb) OR
 (mediateca_folder_name='documentos_direccion' AND allowed_roles='["direccion","superadmin"]'::jsonb) OR
 (mediateca_folder_name='contratos_firmados' AND allowed_roles='["comercial","administracion","operaciones","direccion","superadmin"]'::jsonb)
);
