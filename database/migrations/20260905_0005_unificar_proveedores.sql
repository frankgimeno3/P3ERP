-- Migration: Unificar proveedores duplicados y consolidar nombres

BEGIN;

-- Helper function to normalize provider names for comparison
CREATE OR REPLACE FUNCTION normalize_provider_name(name text) RETURNS text AS $$
BEGIN
  RETURN lower(btrim(name));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to find canonical provider name
CREATE OR REPLACE FUNCTION get_canonical_provider_name(name text) RETURNS text AS $$
DECLARE
  normalized text := normalize_provider_name(name);
  canonical text;
BEGIN
  -- Match and consolidate rules (case-insensitive)
  CASE
    -- 2CHECKOUT consolidation
    WHEN normalized LIKE '2checkout%' THEN canonical := '2CHECKOUT';
    
    -- Adobe consolidation
    WHEN normalized = 'adobe' OR normalized = 'adobe+' THEN canonical := 'Adobe';
    
    -- AIGÜES/AIGUES DE BARCELONA consolidation
    WHEN normalized LIKE 'aigues de barcelona%' OR normalized LIKE 'aigüestm de barcelona%' THEN canonical := 'AIGUES DE BARCELONA';
    
    -- AMAZON BUSINESS (all variants)
    WHEN normalized LIKE 'amazon business%' THEN canonical := 'AMAZON BUSINESS';
    
    -- APPLE consolidation
    WHEN normalized = 'apple' OR normalized = 'apple - icloud' OR normalized LIKE 'apple%' THEN canonical := 'APPLE';
    
    -- Banco Sabadell (case-insensitive)
    WHEN normalized LIKE 'banco sabadell%' THEN canonical := 'Banco Sabadell';
    
    -- CORREOS (all variants starting with it)
    WHEN normalized LIKE 'correos%' THEN canonical := 'CORREOS';
    
    -- DAE consolidation
    WHEN normalized = 'dae laboral' OR normalized = 'dae gabinet laboral' THEN canonical := 'DAE LABORAL';
    
    -- EDISOFT -> SOFTLINE consolidation
    WHEN normalized LIKE 'edisoft%' THEN canonical := 'SOFTLINE';
    
    -- Endesa (all variants starting with it)
    WHEN normalized LIKE 'endesa%' THEN canonical := 'ENDESA';
    
    -- Luis F. Pazos consolidation
    WHEN normalized LIKE 'luis f. pazos%' OR normalized LIKE 'luis f pazos%' THEN canonical := 'Luis F. Pazos';
    
    -- MOEVE consolidation
    WHEN normalized = 'moeve' OR normalized = 'moeve' THEN canonical := 'MOEVE';
    
    -- LinkedIn consolidation
    WHEN normalized = 'linkedin' OR normalized = 'linkedin' THEN canonical := 'LinkedIn';
    
    -- EVARISTO LUQUE (all variants starting with it)
    WHEN normalized LIKE 'evaristo luque%' THEN canonical := 'EVARISTO LUQUE';
    
    -- PIXUP consolidation
    WHEN normalized = 'pix up' OR normalized = 'pixup' THEN canonical := 'PIXUP';
    
    -- SECURITAS DIRECT / VERISURE -> VERISURE consolidation
    WHEN normalized LIKE 'securitas direct%' OR normalized LIKE 'verisure%' THEN canonical := 'VERISURE';
    
    -- THALASSA (all variants starting with it)
    WHEN normalized LIKE 'thalassa%' THEN canonical := 'THALASSA';
    
    -- Default: keep original (but normalized)
    ELSE canonical := name;
  END CASE;
  
  RETURN canonical;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create temporary table to hold consolidation mapping
CREATE TEMP TABLE provider_consolidation_map AS
SELECT DISTINCT
  id_proveedor,
  get_canonical_provider_name(nombre_proveedor) as canonical_name,
  nombre_proveedor as original_name
FROM proveedores_db
WHERE id_proveedor IS NOT NULL;

-- Find first ID for each canonical name (will be our keeper)
CREATE TEMP TABLE provider_canonical_keeper AS
SELECT DISTINCT ON (canonical_name)
  canonical_name,
  id_proveedor as keeper_id,
  original_name
FROM provider_consolidation_map
ORDER BY canonical_name, id_proveedor;

-- Log the consolidation mapping in proveedores_unificados
INSERT INTO proveedores_unificados (id_anterior, id_proveedor, datos_anteriores, datos_destino_anteriores)
SELECT
  pcm.id_proveedor,
  pck.keeper_id,
  jsonb_build_object(
    'id_proveedor', pcm.id_proveedor,
    'nombre_proveedor', pcm.original_name,
    'nombre_fiscal_proveedor', pb.nombre_fiscal_proveedor,
    'vat_code', pb.vat_code,
    'pais_proveedor', pb.pais_proveedor
  ) as datos_anteriores,
  jsonb_build_object(
    'id_proveedor', pck.keeper_id,
    'nombre_proveedor', pck.original_name
  ) as datos_destino_anteriores
FROM provider_consolidation_map pcm
JOIN provider_canonical_keeper pck ON pcm.canonical_name = pck.canonical_name
JOIN proveedores_db pb ON pcm.id_proveedor = pb.id_proveedor
WHERE pcm.id_proveedor != pck.keeper_id;

-- Update all tickets to reference the keeper ID
UPDATE tickets_db t
SET id_proveedor = pck.keeper_id
FROM provider_consolidation_map pcm
JOIN provider_canonical_keeper pck ON pcm.canonical_name = pck.canonical_name
WHERE t.id_proveedor = pcm.id_proveedor
AND t.id_proveedor != pck.keeper_id;

-- Update all facturas_proveedores to reference the keeper ID
UPDATE facturas_proveedores_db fp
SET id_proveedor = pck.keeper_id
FROM provider_consolidation_map pcm
JOIN provider_canonical_keeper pck ON pcm.canonical_name = pck.canonical_name
WHERE fp.id_proveedor = pcm.id_proveedor
AND fp.id_proveedor != pck.keeper_id;

-- Update all pagos to reference the keeper ID
UPDATE pagos_db p
SET id_proveedor = pck.keeper_id
FROM provider_consolidation_map pcm
JOIN provider_canonical_keeper pck ON pcm.canonical_name = pck.canonical_name
WHERE p.id_proveedor = pcm.id_proveedor
AND p.id_proveedor != pck.keeper_id;

-- Update all lineas_bancos to reference the keeper ID
UPDATE lineas_bancos lb
SET id_proveedor = pck.keeper_id
FROM provider_consolidation_map pcm
JOIN provider_canonical_keeper pck ON pcm.canonical_name = pck.canonical_name
WHERE lb.id_proveedor = pcm.id_proveedor
AND lb.id_proveedor != pck.keeper_id;

-- Update all precios_proveedores to reference the keeper ID
UPDATE precios_proveedores pp
SET id_proveedor = pck.keeper_id
FROM provider_consolidation_map pcm
JOIN provider_canonical_keeper pck ON pcm.canonical_name = pck.canonical_name
WHERE pp.id_proveedor = pcm.id_proveedor
AND pp.id_proveedor != pck.keeper_id;

-- Update the canonical provider name in proveedores_db
UPDATE proveedores_db pb
SET nombre_proveedor = pck.original_name
FROM provider_canonical_keeper pck
WHERE pb.id_proveedor = pck.keeper_id;

-- Delete duplicate providers (keep only the keeper for each canonical name)
DELETE FROM proveedores_db
WHERE id_proveedor NOT IN (SELECT keeper_id FROM provider_canonical_keeper);

-- Drop temporary function (keep it for future use if needed)
-- DROP FUNCTION IF EXISTS normalize_provider_name(text);
-- DROP FUNCTION IF EXISTS get_canonical_provider_name(text);

COMMIT;
