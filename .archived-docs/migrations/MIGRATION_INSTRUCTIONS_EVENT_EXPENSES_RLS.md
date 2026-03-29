# Migration Instructions - Update Event Expenses RLS for Campaigns

The Supabase CLI is having connection issues. Please run this migration manually in your Supabase dashboard.

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wrwvkhyluhmtwfxcmuge
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## Migration SQL:

```sql
-- Update RLS policies for event_expenses to support campaign expenses
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view expenses for their org events" ON public.event_expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their org events" ON public.event_expenses;
DROP POLICY IF EXISTS "Users can update expenses for their org events" ON public.event_expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their org events" ON public.event_expenses;

-- Create updated policies that support both event and campaign expenses
-- The policies check that the user belongs to the org_id of the expense,
-- and verify the relationship through either the event or campaign

-- SELECT policy: Users can view expenses for their org
CREATE POLICY "Users can view expenses for their org"
  ON public.event_expenses
  FOR SELECT
  USING (
    user_belongs_to_org(auth.uid(), org_id)
  );

-- INSERT policy: Users can insert expenses for their org
-- Must verify the user belongs to the org and either:
-- - The event exists and belongs to the same org, OR
-- - The campaign exists and belongs to the same org
CREATE POLICY "Users can insert expenses for their org"
  ON public.event_expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND user_belongs_to_org(auth.uid(), org_id)
    AND (
      -- If event_id is set, verify the event belongs to the same org
      (event_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_expenses.event_id
        AND e.org_id = event_expenses.org_id
      ))
      OR
      -- If campaign_id is set, verify the campaign belongs to the same org
      (campaign_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = event_expenses.campaign_id
        AND c.org_id = event_expenses.org_id
      ))
    )
  );

-- UPDATE policy: Users can update expenses for their org
CREATE POLICY "Users can update expenses for their org"
  ON public.event_expenses
  FOR UPDATE
  USING (
    user_belongs_to_org(auth.uid(), org_id)
  );

-- DELETE policy: Users can delete expenses for their org
CREATE POLICY "Users can delete expenses for their org"
  ON public.event_expenses
  FOR DELETE
  USING (
    user_belongs_to_org(auth.uid(), org_id)
  );
```

## What this migration does:

- Updates RLS policies to support both event-based and campaign-based expenses
- Allows users to insert expenses when `campaign_id` is set (previously only worked with `event_id`)
- Simplifies SELECT, UPDATE, and DELETE policies to check org membership directly
- Maintains security by verifying that events/campaigns belong to the same org as the expense

## Why this is needed:

The original RLS policies only checked `event_id`, which caused "row-level security policy" errors when trying to add campaign expenses (where `event_id` is NULL and `campaign_id` is set).

After running this migration, you'll be able to add expenses to campaigns without RLS errors.

