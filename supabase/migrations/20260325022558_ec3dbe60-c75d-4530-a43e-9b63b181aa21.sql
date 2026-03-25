
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  
  insert into public.agent_settings (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;
