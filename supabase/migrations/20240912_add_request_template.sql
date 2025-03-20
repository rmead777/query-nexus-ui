
-- Add request_template column to user_settings table
ALTER TABLE IF EXISTS public.user_settings 
ADD COLUMN IF NOT EXISTS request_template JSONB;

-- Add request_template column to api_endpoints table
ALTER TABLE IF EXISTS public.api_endpoints 
ADD COLUMN IF NOT EXISTS request_template JSONB;

-- Add instructions column to user_settings if it doesn't exist
ALTER TABLE IF EXISTS public.user_settings 
ADD COLUMN IF NOT EXISTS instructions TEXT;
