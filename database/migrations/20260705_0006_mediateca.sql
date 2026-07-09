CREATE TABLE IF NOT EXISTS mediateca_folders (
  mediateca_folder_id uuid PRIMARY KEY,
  mediateca_folder_name text NOT NULL,
  mediateca_parent_folder_id uuid NULL REFERENCES mediateca_folders(mediateca_folder_id) ON DELETE CASCADE,
  mediateca_folder_created_at timestamp with time zone NOT NULL DEFAULT now(),
  mediateca_folder_updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mediateca_contents (
  mediateca_content_id uuid PRIMARY KEY,
  mediateca_folder_id uuid NULL REFERENCES mediateca_folders(mediateca_folder_id) ON DELETE SET NULL,
  mediateca_content_name text NOT NULL,
  mediateca_s3_key text NOT NULL UNIQUE,
  mediateca_content_src text,
  mediateca_content_mime_type text,
  mediateca_content_type text NOT NULL DEFAULT 'image',
  mediateca_content_created_at timestamp with time zone NOT NULL DEFAULT now(),
  mediateca_content_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mediateca_contents_type_check CHECK (mediateca_content_type IN ('image', 'pdf'))
);

CREATE INDEX IF NOT EXISTS mediateca_folders_parent_idx ON mediateca_folders (mediateca_parent_folder_id);
CREATE INDEX IF NOT EXISTS mediateca_folders_name_idx ON mediateca_folders (mediateca_folder_name);
CREATE INDEX IF NOT EXISTS mediateca_contents_folder_idx ON mediateca_contents (mediateca_folder_id);
CREATE INDEX IF NOT EXISTS mediateca_contents_type_idx ON mediateca_contents (mediateca_content_type);
CREATE INDEX IF NOT EXISTS mediateca_contents_created_at_idx ON mediateca_contents (mediateca_content_created_at);
