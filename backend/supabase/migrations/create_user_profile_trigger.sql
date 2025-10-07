-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id,
    email,
    name,
    is_creator,
    level,
    xp,
    total_xp,
    streak_current,
    streak_best,
    badges,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    false, -- default to not creator
    1,     -- starting level
    0,     -- starting xp
    0,     -- starting total_xp
    0,     -- starting streak_current
    0,     -- starting streak_best
    '[]'::jsonb, -- empty badges array
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create user profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Also create a user_progress record for gamification
create or replace function public.handle_new_user_progress()
returns trigger as $$
begin
  insert into public.user_progress (
    user_id,
    total_xp,
    level,
    streak_current,
    streak_best,
    last_activity,
    created_at,
    updated_at
  )
  values (
    new.id,
    0,     -- starting xp
    1,     -- starting level
    0,     -- starting streak_current
    0,     -- starting streak_best
    now(), -- last_activity
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user_progress record
drop trigger if exists on_user_created_progress on public.users;
create trigger on_user_created_progress
  after insert on public.users
  for each row execute procedure public.handle_new_user_progress(); 