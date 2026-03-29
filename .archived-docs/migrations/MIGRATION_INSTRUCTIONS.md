# Migration Instructions

The Supabase CLI is having connection issues. Please run this migration manually in your Supabase dashboard.

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wrwvkhyluhmtwfxcmuge
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## Migration SQL:

```sql
-- Allow pending_invitations.parent_id to reference either org_memberships or pending_invitations
-- This enables assigning children to pending parents

-- First, drop the existing foreign key constraint
ALTER TABLE public.pending_invitations
DROP CONSTRAINT IF EXISTS pending_invitations_parent_id_fkey;

-- Add a new column to track whether the parent is in org_memberships or pending_invitations
-- We'll use a check constraint and function to validate the reference
ALTER TABLE public.pending_invitations
ADD COLUMN IF NOT EXISTS parent_pending_invitation_id uuid REFERENCES public.pending_invitations(id) ON DELETE SET NULL;

-- Create a function to validate that parent_id references either org_memberships or pending_invitations
CREATE OR REPLACE FUNCTION validate_pending_invitation_parent()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_id is set, it must reference org_memberships
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.org_memberships WHERE id = NEW.parent_id) THEN
      RAISE EXCEPTION 'parent_id must reference an existing org_memberships record';
    END IF;
  END IF;
  
  -- If parent_pending_invitation_id is set, it must reference pending_invitations
  IF NEW.parent_pending_invitation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.pending_invitations WHERE id = NEW.parent_pending_invitation_id) THEN
      RAISE EXCEPTION 'parent_pending_invitation_id must reference an existing pending_invitations record';
    END IF;
  END IF;
  
  -- Ensure only one parent reference is set
  IF NEW.parent_id IS NOT NULL AND NEW.parent_pending_invitation_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set both parent_id and parent_pending_invitation_id';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate parent references
DROP TRIGGER IF EXISTS validate_pending_invitation_parent_trigger ON public.pending_invitations;
CREATE TRIGGER validate_pending_invitation_parent_trigger
  BEFORE INSERT OR UPDATE ON public.pending_invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_pending_invitation_parent();

-- Re-add the foreign key constraint for parent_id (references org_memberships)
ALTER TABLE public.pending_invitations
ADD CONSTRAINT pending_invitations_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.org_memberships(id) ON DELETE SET NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_pending_invitations_parent_pending_id 
ON public.pending_invitations(parent_pending_invitation_id);

-- Add comment
COMMENT ON COLUMN public.pending_invitations.parent_pending_invitation_id IS 'Parent pending invitation ID if the parent is also pending (alternative to parent_id)';
```

## What this migration does:

- Adds a new column `parent_pending_invitation_id` to the `pending_invitations` table
- Allows pending children to reference pending parents (not just accepted parents)
- Creates validation logic to ensure data integrity
- Enables the feature to assign players to pending parents

After running this migration, you'll be able to assign children to pending parents without errors.

