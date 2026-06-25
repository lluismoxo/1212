-- 1212 · Motor de niveles (regla central del producto).
-- Subir de nivel SOLO por hábitos: ≥70% de cumplimiento en un MES NATURAL completo.
-- Si el usuario entra a mitad de mes, ese mes no cuenta: el conteo empieza el
-- día 1 del mes siguiente (level_tracking_since).
-- Todo server-side. El cliente NO puede escribir el nivel.

-- desde cuándo cuenta la progresión (primer día del mes siguiente al alta)
alter table public.profiles
  add column if not exists level_tracking_since date;

-- backfill para perfiles existentes
update public.profiles
set level_tracking_since = (date_trunc('month', created_at) + interval '1 month')::date
where level_tracking_since is null;

-- el provision de usuario nuevo también lo fija
create or replace function public.provision_user(p_id uuid, p_name text)
returns void language plpgsql as $$
declare
  uname text;
begin
  uname := 'u' || substr(replace(p_id::text, '-', ''), 1, 19);
  insert into public.profiles (id, username, display_name, level_tracking_since)
  values (p_id, uname, coalesce(nullif(p_name, ''), 'Usuario'),
          (date_trunc('month', now()) + interval '1 month')::date)
  on conflict (id) do nothing;
  insert into public.user_levels (profile_id) values (p_id) on conflict do nothing;
  insert into public.user_roles  (profile_id, role) values (p_id, 'user') on conflict do nothing;
end $$;

-- ── cumplimiento de un mes natural ────────────────────────────
-- % = (días-hábito marcados done) / (días-hábito esperados) en [inicio, fin] del mes.
-- "días-hábito esperados" = por cada hábito activo no archivado, los días del mes
-- desde que existe el hábito (no penaliza por hábitos creados a mitad de mes).
create or replace function public.month_compliance(p_id uuid, p_month date)
returns numeric language plpgsql stable as $$
declare
  m_start date := date_trunc('month', p_month)::date;
  m_end   date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  expected int;
  done_cnt int;
begin
  -- días esperados: para cada hábito, días del mes a partir de su creación
  select coalesce(sum(
           (least(m_end, current_date)
            - greatest(m_start, h.created_at::date)) + 1
         ), 0)::int
  into expected
  from public.habits h
  where h.profile_id = p_id
    and h.created_at::date <= m_end
    and (h.archived = false);

  if expected <= 0 then
    return 0;
  end if;

  select count(*)::int into done_cnt
  from public.habit_logs hl
  join public.habits h on h.id = hl.habit_id
  where hl.profile_id = p_id
    and hl.done = true
    and hl.log_date between m_start and m_end;

  return round((done_cnt::numeric / expected) * 100, 1);
end $$;

-- ── recálculo de nivel para un usuario ────────────────────────
-- Recorre cada mes natural COMPLETO desde level_tracking_since hasta el mes
-- anterior al actual. Por cada mes con ≥70%, sube 1 nivel (máx 9). Idempotente:
-- recalcula desde el nivel 1 según el histórico (no acumula doble).
create or replace function public.recalc_level(p_id uuid)
returns int language plpgsql as $$
declare
  since date;
  m date;
  last_complete date := (date_trunc('month', current_date) - interval '1 day')::date; -- fin del mes pasado
  lvl int := 1;
  pts int := 0;
begin
  select level_tracking_since into since from public.profiles where id = p_id;
  if since is null then since := (date_trunc('month', current_date))::date; end if;

  m := date_trunc('month', since)::date;
  while m <= last_complete and lvl < 9 loop
    if public.month_compliance(p_id, m) >= 70 then
      lvl := lvl + 1;
      pts := pts + 1;
    end if;
    m := (m + interval '1 month')::date;
  end loop;

  update public.user_levels
  set current_level = lvl, points = pts, progress = 0, updated_at = now()
  where profile_id = p_id;

  return lvl;
end $$;
