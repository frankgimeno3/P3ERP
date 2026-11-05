ALTER TABLE direccion_propiedades ADD COLUMN IF NOT EXISTS conjunto TEXT NOT NULL DEFAULT '';
ALTER TABLE direccion_propiedades ADD COLUMN IF NOT EXISTS plaza TEXT NOT NULL DEFAULT '';
ALTER TABLE direccion_propiedades ADD COLUMN IF NOT EXISTS direccion_catastral TEXT NOT NULL DEFAULT '';
COMMENT ON COLUMN direccion_propiedades.conjunto IS 'Parking o conjunto al que pertenece la plaza. Agrupa el inventario sin crear otra propiedad.';
COMMENT ON COLUMN direccion_propiedades.plaza IS 'Número o código de la plaza dentro del parking.';
COMMENT ON COLUMN direccion_propiedades.direccion_catastral IS 'Dirección del recibo catastral, que puede diferir del acceso al parking.';
SELECT public.p3_install_user_event_triggers();
