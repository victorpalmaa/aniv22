-- "Já confirmei" sem código: a pessoa digita o email (link ?c=) ou o nome (link ?f=), o banco acha a
-- confirmação e a passa para a sessão deste navegador. Decisão do Victor (18/11): sem trava extra,
-- quem entra assim vê planta e surpresa e também pode cancelar.
--
-- Como funciona: o front garante uma sessão (anônima se não houver nenhuma) e chama a RPC. A RPC troca
-- rsvps.id (e guest_pins.user_id) do uid antigo para auth.uid(). Planta, Realtime, surpresa e cancelar já
-- dependem só de rsvps.id = auth.uid(), então nada mais muda. Não há insert nem delete em rsvps: o aviso
-- por email (trigger de insert/delete) não dispara e o lugar na planta continua o mesmo.
-- Efeito colateral aceito: o aparelho anterior perde a confirmação até fazer "Já confirmei" de novo.
--
-- Idempotente: pode rodar mais de uma vez.

create extension if not exists unaccent with schema extensions;

-- 1) FKs que apontam para rsvps.id precisam acompanhar a troca de id (ON UPDATE CASCADE).
--    O schema base foi criado pelo SQL Editor, fora do repo; por isso a descoberta é dinâmica.
do $$
declare
  r record;
  v_def text;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    where c.contype = 'f' and c.confrelid = 'public.rsvps'::regclass
  loop
    if r.def !~* 'on update cascade' then
      v_def := regexp_replace(r.def, '\s+ON UPDATE (NO ACTION|RESTRICT|SET NULL|SET DEFAULT)', '', 'i') || ' ON UPDATE CASCADE';
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
      execute format('alter table %s add constraint %I %s', r.tbl, r.conname, v_def);
    end if;
  end loop;
end $$;

-- 2) Troca o dono de uma confirmação. Interna: só as RPCs abaixo chamam.
create or replace function public._move_rsvp(p_old uuid, p_new uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_old = p_new then
    return;
  end if;
  -- esta sessão já tem outra confirmação: não sobrescreve
  if exists (select 1 from public.rsvps where id = p_new) then
    raise exception 'already_confirmed';
  end if;
  update public.rsvps set id = p_new where id = p_old;
  -- sem efeito se o cascade já levou; necessário se guest_pins referenciar auth.users em vez de rsvps
  update public.guest_pins set user_id = p_new where user_id = p_old;
end;
$$;

revoke all on function public._move_rsvp(uuid, uuid) from public, anon, authenticated;

-- 3) Link ?c=: acha pelo email. Devolve o primeiro nome.
create or replace function public.claim_rsvp_by_email(p_code text, p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_first text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.party_code_valid(p_code) then
    raise exception 'bad_code';
  end if;

  select r.id, r.first_name into v_id, v_first
  from public.rsvps r
  where r.via = 'email' and lower(btrim(r.email)) = lower(btrim(coalesce(p_email, '')))
  order by r.created_at
  limit 1;

  if v_id is null then
    raise exception 'not_found';
  end if;

  perform public._move_rsvp(v_id, v_uid);
  return v_first;
end;
$$;

revoke all on function public.claim_rsvp_by_email(text, text) from public, anon;
grant execute on function public.claim_rsvp_by_email(text, text) to authenticated;

-- 4) Link ?f=: acha pelo nome, sem diferenciar maiúscula nem acento.
create or replace function public.claim_rsvp_by_name(p_fam text, p_first text, p_last text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_first text;
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

  select r.id, r.first_name into v_id, v_first
  from public.rsvps r
  where r.via = 'familia'
    and unaccent(lower(btrim(r.first_name))) = unaccent(lower(btrim(coalesce(p_first, ''))))
    and unaccent(lower(btrim(r.last_name)))  = unaccent(lower(btrim(coalesce(p_last, ''))))
  order by r.created_at
  limit 1;

  if v_id is null then
    raise exception 'not_found';
  end if;

  perform public._move_rsvp(v_id, v_uid);
  return v_first;
end;
$$;

revoke all on function public.claim_rsvp_by_name(text, text, text) from public, anon;
grant execute on function public.claim_rsvp_by_name(text, text, text) to authenticated;

-- 5) Confirmação da família: quem digita um nome que já confirmou assume a confirmação existente
--    (troca de id) em vez de apagar e recriar. Mantém o lugar na planta e não gera ✅ repetido.
--    Substitui o delete + insert de 20261118120000_family_link.sql.
create or replace function public.confirm_rsvp_family(p_fam text, p_first text, p_last text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid   uuid := auth.uid();
  v_first text := btrim(coalesce(p_first, ''));
  v_last  text := btrim(coalesce(p_last, ''));
  v_id    uuid;
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

  select r.id into v_id
  from public.rsvps r
  where r.via = 'familia'
    and unaccent(lower(r.first_name)) = unaccent(lower(v_first))
    and unaccent(lower(r.last_name))  = unaccent(lower(v_last))
  order by r.created_at
  limit 1;

  if v_id is not null then
    perform public._move_rsvp(v_id, v_uid);
    return;
  end if;

  -- capacidade e criação do pin continuam nos triggers de rsvps (rsvps_capacity, rsvps_pin)
  insert into public.rsvps (id, email, first_name, last_name, via)
  values (v_uid, null, v_first, v_last, 'familia');
end;
$$;

revoke all on function public.confirm_rsvp_family(text, text, text) from public, anon;
grant execute on function public.confirm_rsvp_family(text, text, text) to authenticated;
