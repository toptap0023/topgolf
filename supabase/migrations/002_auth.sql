-- ============================================================
-- 002_auth.sql — เปลี่ยนเป็นระบบสมาชิก (ข้อมูลแยกราย user)
-- รันใน Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- STEP 1: รันได้เลยตอนนี้ ---------------------------------------

-- ผูกทุกแถวกับเจ้าของ; แถวใหม่ติด user อัตโนมัติจาก JWT
alter table public.golf_sessions add column if not exists user_id uuid default auth.uid();
alter table public.golf_shots    add column if not exists user_id uuid default auth.uid();
alter table public.golf_rounds   add column if not exists user_id uuid default auth.uid();

create index if not exists golf_sessions_user_idx on public.golf_sessions(user_id);
create index if not exists golf_shots_user_idx    on public.golf_shots(user_id);
create index if not exists golf_rounds_user_idx   on public.golf_rounds(user_id);

-- ปิดยุค public: ลบ policy เปิดกว้างเดิม
drop policy if exists golf_sessions_public on public.golf_sessions;
drop policy if exists golf_shots_public    on public.golf_shots;
drop policy if exists golf_rounds_public   on public.golf_rounds;

-- เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง
create policy golf_sessions_own on public.golf_sessions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy golf_shots_own on public.golf_shots
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy golf_rounds_own on public.golf_rounds
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- STEP 2: รัน "หลังจาก" สมัครบัญชีในแอปเสร็จแล้ว ------------------
-- ย้ายข้อมูลเดิมทั้งหมด (user_id ยังว่าง) เข้าบัญชีคุณ:
--
-- update public.golf_sessions set user_id = (select id from auth.users where email = 'tre.thitipat@gmail.com') where user_id is null;
-- update public.golf_shots    set user_id = (select id from auth.users where email = 'tre.thitipat@gmail.com') where user_id is null;
-- update public.golf_rounds   set user_id = (select id from auth.users where email = 'tre.thitipat@gmail.com') where user_id is null;
