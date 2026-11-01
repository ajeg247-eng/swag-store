-- Ejecutar UNA SOLA VEZ en Supabase > SQL Editor > New query.
-- Crea el bucket público para imágenes de catálogo y permite gestionarlas
-- únicamente a usuarios autenticados (el inicio de sesión CEO de SWAG).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'swag-media',
  'swag-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública para que los visitantes puedan ver las fotografías.
drop policy if exists "SWAG media public read" on storage.objects;
create policy "SWAG media public read"
on storage.objects for select
to public
using (bucket_id = 'swag-media');

-- Solo usuarios con sesión pueden subir, modificar o borrar imágenes.
drop policy if exists "SWAG media authenticated insert" on storage.objects;
create policy "SWAG media authenticated insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'swag-media');

drop policy if exists "SWAG media authenticated update" on storage.objects;
create policy "SWAG media authenticated update"
on storage.objects for update
to authenticated
using (bucket_id = 'swag-media')
with check (bucket_id = 'swag-media');

drop policy if exists "SWAG media authenticated delete" on storage.objects;
create policy "SWAG media authenticated delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'swag-media');
