-- Link da família: confirma só com nome e sobrenome, sem email.
-- Fluxo: o front faz signInAnonymously() (usuário real no auth.users, sem email) e chama
-- confirm_rsvp_family(p_fam, p_first, p_last). Tudo o mais (planta, Realtime, Surpresa) já depende
-- só de existir linha em rsvps para auth.uid(), então funciona igual para a família.
--
-- O código da família NÃO entra aqui (repo público). Ele é gravado à parte:
--   update public.party_config set family_code = '<código>';
-- Pré-requisito no dashboard: Authentication > Sign In / Providers > "Allow anonymous sign-ins".

-- 1) Código da família, guardado na mesma linha de config (sem policy: só security definer lê).
alter table public.party_config add column if not exists family_code text;

-- 2) rsvps aceita linha sem email, mas só quando veio do link da família.
alter table public.rsvps add column if not exists via text not null default 'email';
alter table public.rsvps alter column email drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rsvps_via_check') then
    alter table public.rsvps add constraint rsvps_via_check check (via in ('email', 'familia'));
  end if;
  -- sessão anônima tem email vazio no JWT: sem esta regra, ela passaria pelo confirm_rsvp comum
  -- (link com o código da festa) e confirmaria sem verificar email.
  if not exists (select 1 from pg_constraint where conname = 'rsvps_email_required') then
    alter table public.rsvps add constraint rsvps_email_required check (via = 'familia' or coalesce(btrim(email), '') <> '');
  end if;
end $$;

-- 3) Confirmação da família.
create or replace function public.confirm_rsvp_family(p_fam text, p_first text, p_last text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_first text := btrim(coalesce(p_first, ''));
  v_last  text := btrim(coalesce(p_last, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.party_config
    where family_code is not null and lower(family_code) = lower(btrim(coalesce(p_fam, '')))
  ) then
    raise exception 'bad_code';
  end if;
  if v_first = '' or v_last = '' or length(v_first) > 60 or length(v_last) > 60 then
    raise exception 'bad_name';
  end if;

  -- idempotente: já confirmado nesta sessão
  if exists (select 1 from public.rsvps where id = v_uid) then
    return;
  end if;

  -- mesma pessoa abrindo o link em outro navegador (WhatsApp x Safari) ganha outra sessão anônima:
  -- assume a confirmação anterior pelo nome, em vez de aparecer duas vezes na planta.
  -- Só vale entre confirmações da família; nunca apaga quem confirmou por email.
  delete from public.rsvps
  where via = 'familia'
    and lower(first_name) = lower(v_first)
    and lower(last_name) = lower(v_last);

  -- capacidade e criação do pin continuam nos triggers de rsvps (rsvps_capacity, rsvps_pin)
  insert into public.rsvps (id, email, first_name, last_name, via)
  values (v_uid, null, v_first, v_last, 'familia');
end;
$$;

revoke all on function public.confirm_rsvp_family(text, text, text) from public, anon;
grant execute on function public.confirm_rsvp_family(text, text, text) to authenticated;
