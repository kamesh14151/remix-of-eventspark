
-- ─────────────────────────────────────────────────────────────
-- Fix 1: Allow authenticated users to see live events too
-- (needed for /register/:slug — a logged-in user visiting
--  someone else's registration page was getting "Event Not Found")
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view live events" ON public.events;
CREATE POLICY "Public can view live events" ON public.events
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (status = 'live'::event_status);

-- ─────────────────────────────────────────────────────────────
-- Fix 2: Restore form fields public read for live events
-- (anon & authenticated need to read form fields to render the
--  registration form on /register/:slug)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view form fields for live events" ON public.form_fields;
CREATE POLICY "Public can view form fields for live events" ON public.form_fields
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = form_fields.event_id
        AND events.status = 'live'::event_status
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Fix 3: RPC for the dashboard — returns ONLY events the user
-- owns OR is an invited member of (ignores the broad live-event
-- SELECT policy above, so the dashboard stays scoped correctly)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_accessible_events(p_search text DEFAULT NULL)
RETURNS SETOF public.events
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT e.*
  FROM public.events e
  WHERE (
    e.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = e.id AND em.user_id = auth.uid()
    )
  )
  AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%')
  ORDER BY e.created_at DESC;
$$;

NOTIFY pgrst, 'reload schema';
