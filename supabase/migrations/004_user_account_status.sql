# Run in Supabase SQL Editor if login shows "is_active column" errors:
#   supabase/migrations/004_user_account_status.sql

-- Farmer account active flag (admins can deactivate without deleting auth)
alter table public.users
  add column if not exists is_active boolean not null default true;

create index if not exists idx_users_is_active on public.users (is_active, role);

comment on column public.users.is_active is 'When false, farmer cannot sign in. Admins manage via admin panel.';
