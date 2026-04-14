ALTER TABLE public.user_media
  ADD COLUMN file_name TEXT;

UPDATE public.user_media
SET file_name = COALESCE(
  NULLIF(regexp_replace(split_part(storage_path, '/', array_length(string_to_array(storage_path, '/'), 1)), '^\d+_', ''), ''),
  split_part(storage_path, '/', array_length(string_to_array(storage_path, '/'), 1)),
  'media-file'
)
WHERE file_name IS NULL;

ALTER TABLE public.user_media
  ALTER COLUMN file_name SET NOT NULL;
