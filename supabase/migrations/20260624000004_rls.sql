-- 1212 · Row Level Security. Toda tabla expuesta tiene RLS habilitada.
-- Regla base: denegar por defecto; políticas explícitas mínimas.
-- auth.uid() = id del usuario autenticado (= profiles.id).

-- ── habilitar RLS en todas ────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.social_links        enable row level security;
alter table public.locations           enable row level security;
alter table public.levels              enable row level security;
alter table public.user_levels         enable row level security;
alter table public.roles               enable row level security;
alter table public.user_roles          enable row level security;
alter table public.habits              enable row level security;
alter table public.habit_logs          enable row level security;
alter table public.tasks               enable row level security;
alter table public.journal_entries     enable row level security;
alter table public.communities         enable row level security;
alter table public.community_members   enable row level security;
alter table public.community_messages  enable row level security;
alter table public.community_files     enable row level security;
alter table public.moderation_reports  enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.app_config          enable row level security;

-- ── PROFILES ──────────────────────────────────────────────────
-- lectura pública de perfiles públicos no borrados; el dueño y admin ven el suyo siempre
create policy profiles_read_public on public.profiles
  for select using (
    (is_public = true and deleted_at is null) or id = auth.uid() or public.is_admin()
  );
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ── SOCIAL LINKS ──────────────────────────────────────────────
create policy social_read on public.social_links
  for select using (
    exists (select 1 from public.profiles p
            where p.id = social_links.profile_id
              and (p.is_public or p.id = auth.uid() or public.is_admin())
              and p.deleted_at is null)
  );
create policy social_write_own on public.social_links
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── LOCATIONS (pública por diseño; escribe solo el dueño) ─────
-- Nota seguridad: exposición controlada por profiles.location_sharing en la capa de consulta/RPC.
create policy locations_read on public.locations
  for select using (
    exists (select 1 from public.profiles p
            where p.id = locations.profile_id
              and p.deleted_at is null
              and p.location_sharing <> 'off'
              and (p.is_public or p.id = auth.uid()))
    or public.is_admin()
  );
create policy locations_write_own on public.locations
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── LEVELS (catálogo: lectura para todos los autenticados) ────
create policy levels_read on public.levels for select using (auth.role() = 'authenticated');

-- ── USER_LEVELS ───────────────────────────────────────────────
create policy user_levels_read on public.user_levels
  for select using (
    profile_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.profiles p where p.id = user_levels.profile_id and p.is_public and p.deleted_at is null)
  );
-- escritura solo vía RPC server-side (no policy de update directo para el cliente)
create policy user_levels_admin on public.user_levels
  for all using (public.is_admin()) with check (public.is_admin());

-- ── ROLES / USER_ROLES (solo admin gestiona; usuario lee el suyo) ─
create policy roles_read on public.roles for select using (auth.role() = 'authenticated');
create policy user_roles_read_own on public.user_roles
  for select using (profile_id = auth.uid() or public.is_admin());
create policy user_roles_admin on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- ── HABITS / LOGS / TASKS / JOURNAL (privados del dueño) ──────
create policy habits_own on public.habits
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy habit_logs_own on public.habit_logs
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy tasks_own on public.tasks
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy journal_own on public.journal_entries
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- admin lectura (acceso interno del propietario)
create policy habits_admin_read on public.habits for select using (public.is_admin());
create policy tasks_admin_read on public.tasks for select using (public.is_admin());
-- journal NO legible por admin por defecto (privacidad máxima del diario)

-- ── COMMUNITIES ───────────────────────────────────────────────
-- comunidades públicas visibles; privadas solo a miembros
create policy communities_read on public.communities
  for select using (is_private = false or public.is_member(id) or public.is_admin());
create policy communities_admin on public.communities
  for all using (public.is_admin()) with check (public.is_admin());

-- ── COMMUNITY MEMBERS ─────────────────────────────────────────
create policy members_read on public.community_members
  for select using (public.is_member(community_id) or public.is_admin());
create policy members_join_self on public.community_members
  for insert with check (profile_id = auth.uid());           -- unirse a sí mismo
create policy members_leave_self on public.community_members
  for delete using (profile_id = auth.uid() or public.is_moderator(community_id) or public.is_admin());
create policy members_mod_manage on public.community_members
  for update using (public.is_moderator(community_id) or public.is_admin());

-- ── COMMUNITY MESSAGES ────────────────────────────────────────
create policy messages_read on public.community_messages
  for select using ((public.is_member(community_id) and hidden = false) or public.is_moderator(community_id) or public.is_admin());
create policy messages_post on public.community_messages
  for insert with check (public.is_member(community_id) and profile_id = auth.uid());
create policy messages_edit_own on public.community_messages
  for update using (profile_id = auth.uid() or public.is_moderator(community_id) or public.is_admin());
create policy messages_delete on public.community_messages
  for delete using (profile_id = auth.uid() or public.is_moderator(community_id) or public.is_admin());

-- ── COMMUNITY FILES ───────────────────────────────────────────
create policy files_read on public.community_files
  for select using (public.is_member(community_id) or public.is_admin());
create policy files_write on public.community_files
  for insert with check (public.is_member(community_id) and profile_id = auth.uid());
create policy files_delete on public.community_files
  for delete using (profile_id = auth.uid() or public.is_moderator(community_id) or public.is_admin());

-- ── MODERATION ────────────────────────────────────────────────
create policy reports_create on public.moderation_reports
  for insert with check (reporter_id = auth.uid());
create policy reports_read on public.moderation_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy reports_admin on public.moderation_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ── AUDIT LOGS (solo admin lee; inserción server-side) ────────
create policy audit_admin_read on public.audit_logs for select using (public.is_admin());

-- ── APP CONFIG (solo admin) ───────────────────────────────────
create policy config_admin on public.app_config
  for all using (public.is_admin()) with check (public.is_admin());
