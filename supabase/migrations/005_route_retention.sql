-- Keep routes for 30 days. Location points are ~95% of the database (all-day tracking is
-- ~10-15 MB per person per year); meals, habits and focus sessions are tiny and stay until
-- the user deletes them. Runs nightly inside Postgres, so it needs no app or server running.
-- The app mirrors the 30 in src/lib/location/config.ts (ROUTE_KEEP_DAYS).

create extension if not exists pg_cron with schema pg_catalog;

-- 21:30 UTC = 03:00 IST, when nobody is logging. Re-running this file replaces the job by name.
select cron.schedule(
  'delete-routes-older-than-30-days',
  '30 21 * * *',
  $$delete from public.location_points where recorded_at < now() - interval '30 days'$$
);
