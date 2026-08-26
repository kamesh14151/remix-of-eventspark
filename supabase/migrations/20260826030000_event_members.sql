
-- ─────────────────────────────────────────────────────────────
-- event_members: allow multiple users to co-manage an event
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.event_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- Event owner can see, add and remove members
CREATE POLICY "Event owners can manage members" ON public.event_members
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_members.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Members can see their own membership rows
CREATE POLICY "Members can view own membership" ON public.event_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_event_members_event_id ON public.event_members (event_id);
CREATE INDEX idx_event_members_user_id  ON public.event_members (user_id);

-- ─────────────────────────────────────────────────────────────
-- Helper: check if a user is a member (owner OR invited member)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND user_id = p_user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: invite a user by email to an event
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_member_to_event(p_event_id uuid, p_email text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
  v_caller_is_owner boolean;
BEGIN
  -- Only the event owner can invite
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND user_id = auth.uid()
  ) INTO v_caller_is_owner;

  IF NOT v_caller_is_owner THEN
    RAISE EXCEPTION 'Only the event owner can invite members';
  END IF;

  -- Look up the user by email
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'No account found with email: %', p_email;
  END IF;

  -- Prevent owner from adding themselves
  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You are already the event owner';
  END IF;

  -- Insert (ignore conflict = already a member)
  INSERT INTO public.event_members (event_id, user_id, invited_by)
  VALUES (p_event_id, v_target_user_id, auth.uid())
  ON CONFLICT (event_id, user_id) DO NOTHING;

  RETURN json_build_object('user_id', v_target_user_id, 'email', p_email);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: remove a member from an event
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_event_member(p_event_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only the event owner can remove members
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the event owner can remove members';
  END IF;

  DELETE FROM public.event_members
  WHERE event_id = p_event_id AND user_id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Update RLS on EVENTS — members can SELECT
-- ─────────────────────────────────────────────────────────────

-- "Public can view live events" was TO anon, authenticated — this let ANY
-- logged-in user see ALL live events on the dashboard. Restrict to anon only
-- (needed for the public /register/:slug page). Authenticated users must be
-- the owner or an invited member.
DROP POLICY IF EXISTS "Public can view live events" ON public.events;
CREATE POLICY "Public can view live events" ON public.events
  AS PERMISSIVE FOR SELECT TO anon
  USING (status = 'live'::event_status);

DROP POLICY IF EXISTS "Users can view own events" ON public.events;
CREATE POLICY "Users can view own events" ON public.events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_event_member(id, auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Update RLS on REGISTRATIONS — members can SELECT + UPDATE
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Event owners can view registrations" ON public.registrations;
CREATE POLICY "Event owners can view registrations" ON public.registrations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_event_member(event_id, auth.uid()));

DROP POLICY IF EXISTS "Event owners can update registrations" ON public.registrations;
CREATE POLICY "Event owners can update registrations" ON public.registrations
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id, auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Update RLS on FORM_FIELDS — members can manage
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage form fields via event ownership" ON public.form_fields;
CREATE POLICY "Users can manage form fields via event ownership" ON public.form_fields
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_event_member(event_id, auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Update RLS on EMAIL_TEMPLATES — members can manage
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage email templates via event ownership" ON public.email_templates;
CREATE POLICY "Users can manage email templates via event ownership" ON public.email_templates
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_event_member(event_id, auth.uid()));

NOTIFY pgrst, 'reload schema';
