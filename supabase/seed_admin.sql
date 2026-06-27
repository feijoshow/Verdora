-- Promote an existing account to admin
-- Replace the email, then run in Supabase SQL Editor.

update public.users
set role = 'admin', updated_at = now()
where email = 'tukunamulundu@gmail.com';

-- Verify:
-- select id, email, role from public.users where role = 'admin';
