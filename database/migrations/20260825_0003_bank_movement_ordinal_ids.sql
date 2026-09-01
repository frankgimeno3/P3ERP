BEGIN;

ALTER TABLE lineas_bancos
  DROP CONSTRAINT IF EXISTS lineas_bancos_id_check;

UPDATE lineas_bancos
SET id_linea_banco =
  'banc_' || split_part(id_linea_banco, '_', 1) || '_' ||
  split_part(id_linea_banco, '_', 2) || '_' ||
  regexp_replace(
    lpad(regexp_replace(split_part(id_linea_banco, '_', 3), '[^0-9]', '', 'g'), 9, '0'),
    '([0-9]{3})([0-9]{3})([0-9]{3})',
    '\1.\2.\3'
  )
WHERE id_linea_banco ~ '^(sab|san)_[0-9]{2}_[0-9]+$';

ALTER TABLE lineas_bancos
  ADD CONSTRAINT lineas_bancos_id_check
  CHECK (id_linea_banco ~ '^banc_(sab|san)_[0-9]{2}_[0-9]{3}\.[0-9]{3}\.[0-9]{3}$');

COMMIT;
