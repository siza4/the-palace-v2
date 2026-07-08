create table if not exists member_profiles (

    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete cascade,

    display_name text,

    royal_title text default 'Citizen',

    bio text,

    avatar_url text,

    language text default 'English',

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);
