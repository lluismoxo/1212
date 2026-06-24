-- 1212 · Fix: el username provisional de provision_user excedía 20 chars
-- (violaba profiles_username_check). Se trunca a 20.

create or replace function public.provision_user(p_id uuid, p_name text)
returns void language plpgsql as $$
declare
  uname text;
begin
  -- 'u' + 19 hex del uuid = 20 chars, dentro de ^[a-z0-9_.]{3,20}$
  uname := 'u' || substr(replace(p_id::text, '-', ''), 1, 19);

  insert into public.profiles (id, username, display_name)
  values (p_id, uname, coalesce(nullif(p_name, ''), 'Usuario'))
  on conflict (id) do nothing;
  insert into public.user_levels (profile_id) values (p_id) on conflict do nothing;
  insert into public.user_roles  (profile_id, role) values (p_id, 'user') on conflict do nothing;
end $$;
