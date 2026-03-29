# Migration Instructions - Add Chat Read Tracking

Please run this migration manually in your Supabase dashboard.

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wrwvkhyluhmtwfxcmuge
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## Migration SQL:

```sql
-- Create table to track when users last read messages in each channel
CREATE TABLE IF NOT EXISTS public.chat_read_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_read_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own read tracking"
  ON public.chat_read_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read tracking"
  ON public.chat_read_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read tracking"
  ON public.chat_read_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_chat_read_tracking_user_channel ON public.chat_read_tracking(user_id, channel_id);
CREATE INDEX idx_chat_read_tracking_channel ON public.chat_read_tracking(channel_id);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_read_tracking_updated_at
  BEFORE UPDATE ON public.chat_read_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

## What this migration does:

- Creates a `chat_read_tracking` table to track when each user last read messages in each channel
- Enables Row Level Security (RLS) so users can only see/modify their own read tracking
- Creates indexes for efficient querying
- Sets up automatic `updated_at` timestamp updates

## Why this is needed:

This table enables the notification system for chat messages. It tracks when users last viewed each channel, allowing the system to:
- Show notification badges on channels with unread messages
- Show a notification badge on the Team Chat link in the sidebar when there are unread messages
- Automatically mark messages as read when a user views a channel

After running this migration, the chat notification system will be fully functional.

