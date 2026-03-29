
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  status text default 'lead' check (status in ('lead', 'qualified', 'meeting', 'closed')),
  ai_summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.call_logs (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  duration_seconds integer default 0,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  transcription text,
  recording_url text,
  status text default 'initiated' check (status in ('initiated', 'ringing', 'in_progress', 'completed', 'failed')),
  vapi_call_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.agent_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  voice_id text default 'professional_male_1',
  language text default 'es-ES',
  prompt_instruction text,
  is_active boolean default false
);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.call_logs enable row level security;
alter table public.agent_settings enable row level security;

create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can manage their own leads" on public.leads for all using (auth.uid() = user_id);

create policy "Users can view their own call logs" on public.call_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own call logs" on public.call_logs for insert with check (auth.uid() = user_id);

create policy "Users can manage their own agent settings" on public.agent_settings for all using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  
  insert into public.agent_settings (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
