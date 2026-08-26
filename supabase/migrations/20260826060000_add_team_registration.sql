-- Add team registration fields to events
ALTER TABLE public.events ADD COLUMN max_team_size INT DEFAULT 1;
ALTER TABLE public.events ADD COLUMN team_pricing TEXT DEFAULT 'per_member';
