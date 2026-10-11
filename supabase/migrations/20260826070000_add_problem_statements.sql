-- Add problem_statements and min_team_size to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS problem_statements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS min_team_size INT DEFAULT 1;
