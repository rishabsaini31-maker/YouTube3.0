-- Add passwordHash column to Profile table
-- Run this SQL in the Supabase SQL Editor or via psql before deploying the updated code

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- Note: Existing users created before this migration will not have a passwordHash.
-- They will need to reset their password or create a new account.
-- To set a password for an existing user manually:
-- UPDATE "Profile" SET "passwordHash" = '<salt>:<hash>' WHERE "email" = 'user@example.com';
-- The hash format is: pbkdf2_sha512$10000$<16-byte-hex-salt>$<64-byte-hex-hash>
