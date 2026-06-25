-- 1212 · Semilla de las 7 comunidades iniciales (públicas, del sistema).
-- Idempotente por slug. created_by = null (no pertenecen a un usuario).

insert into public.communities (slug, name, description, goal, colors, is_private, created_by) values
  ('consultoria', 'CONSULTORÍA', 'Estrategia, captación de clientes y crecimiento para consultores independientes.', 'Cerrar tu primer cliente de alto valor en 90 días.', '["#2C7D63","#155040"]', false, null),
  ('ia', 'IA', 'Automatización, prompts y herramientas de IA aplicada a tu negocio.', 'Lanzar un producto potenciado con IA este trimestre.', '["#4787BE","#28567B"]', false, null),
  ('ecommerce', 'ECOMMERCE', 'Tiendas online, logística y optimización de conversión.', 'Escalar a 10k/mes de facturación con margen sano.', '["#9A8748","#D0AE5A"]', false, null),
  ('marca-personal', 'MARCA PERSONAL', 'Construye autoridad y una audiencia que confía en ti.', 'Publicar con constancia durante 30 días seguidos.', '["#5B4A86","#241738"]', false, null),
  ('creacion-contenido', 'CREACIÓN DE CONTENIDO', 'Guiones, edición y formatos que retienen la atención.', 'Superar las 100k visualizaciones en un vídeo.', '["#33998C","#114440"]', false, null),
  ('finanzas', 'FINANZAS', 'Inversión, ahorro y libertad financiera a largo plazo.', 'Construir 6 meses de fondo de emergencia.', '["#3AAAC2","#134E5C"]', false, null),
  ('reselling', 'RESELLING', 'Compra-venta inteligente y arbitraje de producto.', 'Hacer tus primeras 50 ventas.', '["#869CC0","#566A8C"]', false, null)
on conflict (slug) do nothing;
