-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run every minute
-- Note: Replace 'your-project-ref' with your actual Supabase project reference
-- Replace 'YOUR_SERVICE_ROLE_KEY' with your service role key (stored in vault for safety)

-- We use net.http_post to call the Edge Function
-- First, ensure the 'net' extension is available (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "net";

SELECT cron.schedule(
    'sync-matches-every-minute',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://bpeaxzhrhebmhbehbrli.supabase.co/functions/v1/sync-matches',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
        ),
        body := '{}'
    )
    $$
);
