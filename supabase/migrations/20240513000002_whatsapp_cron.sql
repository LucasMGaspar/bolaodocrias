-- Cron: notificação WhatsApp 1x por hora
-- Dispara a Edge Function notify-whatsapp que verifica jogos começando em 30-90 min
-- Executar no Supabase SQL Editor após fazer deploy da Edge Function

SELECT cron.schedule(
  'notify-whatsapp-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
