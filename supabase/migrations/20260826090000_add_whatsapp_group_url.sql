-- Add whatsapp_group_url to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS whatsapp_group_url TEXT;
