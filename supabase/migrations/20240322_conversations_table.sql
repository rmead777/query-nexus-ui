
-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  conversation_id UUID NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can only view their own conversations
CREATE POLICY "Users can view their own conversations" 
  ON public.conversations 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only insert their own conversations
CREATE POLICY "Users can insert their own conversations" 
  ON public.conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own conversations
CREATE POLICY "Users can update their own conversations" 
  ON public.conversations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can only delete their own conversations
CREATE POLICY "Users can delete their own conversations" 
  ON public.conversations 
  FOR DELETE 
  USING (auth.uid() = user_id);
