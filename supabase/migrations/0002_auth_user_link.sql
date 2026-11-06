-- KahaniGhar auth user linkage migration
-- Adds user_id foreign key to members table for Supabase Auth integration
-- Run after 0001_init.sql

-- Add user_id column to members table
alter table if exists members
add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Add unique constraint: one member per auth user
create unique index if not exists idx_members_user_id on members(user_id)
where user_id is not null;

-- Add index for family queries by user_id
create index if not exists idx_members_family_user on members(family_id, user_id);

-- Note: Existing family members will need to be manually linked to auth users
-- after they sign up. The application should provide a "Link Account" flow
-- where an authenticated user can claim an existing member profile.
-- Until linked, those members cannot authenticate via Supabase Auth.