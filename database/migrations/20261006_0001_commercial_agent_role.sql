BEGIN;

INSERT INTO agentes_roles (id_rol, nombre_rol, descripcion_rol, permisos_rol, estado_rol)
SELECT 'comercial', 'Comercial',
       'Gestión comercial. Puede asignarse a cuentas, propuestas y contratos; los contactos usan el agente de su cuenta.',
       permisos_rol, 'activo'
FROM agentes_roles WHERE id_rol = 'base'
ON CONFLICT (id_rol) DO NOTHING;

UPDATE agentes_db
SET rol_agente = 'comercial', updated_at = NOW()
WHERE id_agente IN (
  'ag_aec52ab9fa4b440da7c2',
  'ag_import_a0ad4bdd03341c6cbd39',
  'ag_import_d2c4918894006618fc62',
  'ag_import_b05aac77fbbcd127f49c',
  'ag_import_d57af8cb08c748632839',
  'ag_import_7ce232f6b38630b158dd',
  'ag_import_d3b879b65bdd539fa87d',
  'ag_import_4690ac5ad6353999b410',
  'ag_import_d8bb61f8798523c74950',
  'ag_import_a2978e6f9767b7045cc2',
  'ag_import_ea9356bbf1714502eb60',
  'ag_import_e6ef7f607e7444a7f955'
) AND rol_agente = 'base';

COMMIT;
