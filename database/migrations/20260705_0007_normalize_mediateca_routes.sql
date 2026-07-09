CREATE OR REPLACE FUNCTION p3_normalize_mediateca_route_segment(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '_' from regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(input, '')),
          'áàäâãåāéèëêíìïîóòöôõúùüûñçýÿ',
          'aaaaaaaeeeeiiiiooooouuuuncyy'
        ),
        '[[:space:]_\-–—]+',
        '_',
        'g'
      ),
      '[^a-z0-9_]+',
      '',
      'g'
    ),
    '_+',
    '_',
    'g'
  ));
$$;

UPDATE mediateca_folders
SET mediateca_folder_name = COALESCE(
      NULLIF(p3_normalize_mediateca_route_segment(mediateca_folder_name), ''),
      'carpeta_' || replace(left(mediateca_folder_id::text, 8), '-', '_')
    ),
    mediateca_folder_updated_at = NOW()
WHERE mediateca_folder_name IS DISTINCT FROM COALESCE(
      NULLIF(p3_normalize_mediateca_route_segment(mediateca_folder_name), ''),
      'carpeta_' || replace(left(mediateca_folder_id::text, 8), '-', '_')
    );
