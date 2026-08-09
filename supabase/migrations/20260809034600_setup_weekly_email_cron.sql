CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove the job if it already exists to avoid duplicates
SELECT cron.unschedule('weekly-engagement-email-job');

-- Schedule the job
SELECT cron.schedule(
  'weekly-engagement-email-job',
  '0 10 * * 6',
  $$
    SELECT net.http_post(
        url:='https://jicrumwdnwmjkotkbjtg.supabase.co/functions/v1/weekly-engagement-email',
        headers:=(
            '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'
        )::jsonb,
        body:='{}'::jsonb
    );
  $$
);
