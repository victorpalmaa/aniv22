-- Surpresa: conteúdo da atração e imagens só para quem confirmou presença (tem linha em rsvps).
-- Idempotente. NÃO coloque dados da atração aqui: o repo é público. O conteúdo entra pelo seed local
-- (fora do repo) e as imagens pelo painel do Storage, no bucket privado `surprise`.

-- 1) Quem pode ver: confirmado = linha em rsvps com o próprio uid.
--    security definer para não depender da policy de select de rsvps; search_path fixo.
create or replace function public.surprise_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.rsvps r where r.id = auth.uid());
$$;

revoke all on function public.surprise_allowed() from public, anon;
grant execute on function public.surprise_allowed() to authenticated;

-- 2) Conteúdo: uma linha só (id = 1).
create table if not exists public.surprise (
  id          smallint primary key default 1 check (id = 1),
  name        text not null,
  role        text not null,
  when_text   text not null,
  ig          text,
  photo_path  text,          -- objeto no bucket `surprise` (ex.: cantor.webp)
  stage_path  text,          -- objeto no bucket `surprise` (ex.: palco.webp)
  updated_at  timestamptz not null default now()
);

alter table public.surprise enable row level security;

revoke all on public.surprise from public, anon, authenticated;
grant select on public.surprise to authenticated;

drop policy if exists surprise_select_confirmed on public.surprise;
create policy surprise_select_confirmed
  on public.surprise
  for select
  to authenticated
  using (public.surprise_allowed());

-- Fora do Realtime de propósito: nada de publication para esta tabela.

-- 3) Bucket privado. Leitura só por URL assinada, emitida para quem passa na mesma regra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('surprise', 'surprise', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists surprise_objects_read_confirmed on storage.objects;
create policy surprise_objects_read_confirmed
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'surprise' and public.surprise_allowed());

-- Sem policy de insert/update/delete: upload só pelo painel (service role).
