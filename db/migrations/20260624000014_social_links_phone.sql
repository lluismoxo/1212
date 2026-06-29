-- Amplía los tipos de enlace social para incluir teléfono y WhatsApp,
-- pedidos para la edición de cuenta. Se recrea el CHECK del campo kind.
alter table public.social_links drop constraint if exists social_links_kind_check;
alter table public.social_links add constraint social_links_kind_check
  check (kind in ('instagram','x','youtube','linkedin','web','tiktok','phone','whatsapp'));

-- El valor ya no es siempre una URL http (phone = número, instagram = @usuario...).
-- Se relaja el CHECK de url a "no vacío y longitud razonable".
alter table public.social_links drop constraint if exists social_links_url_check;
alter table public.social_links add constraint social_links_url_check
  check (char_length(url) between 1 and 300);
