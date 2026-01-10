-- =====================================================
-- FIX: Migration from Firebase to Supabase Auth
-- Run this ONCE to fix the users table
-- =====================================================

-- Remove firebase_uid NOT NULL constraint
ALTER TABLE public.users ALTER COLUMN firebase_uid DROP NOT NULL;

-- Make the id the same as auth.users id (for new signups)
-- The trigger will now work correctly

-- Optional: Drop the firebase_uid column if you don't need it anymore
-- ALTER TABLE public.users DROP COLUMN firebase_uid;
-- DROP INDEX IF EXISTS idx_users_firebase_uid;
