-- 1212 · Default de location_sharing → 'city' (privacidad por defecto, RGPD).
-- Decisión MVP: la ubicación exacta deja de ser el valor por defecto.
-- El usuario puede subir a 'exact' explícitamente desde su perfil.

alter table public.profiles
  alter column location_sharing set default 'city';
