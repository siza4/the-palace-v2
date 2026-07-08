create table if not exists activity_logs (

    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete cascade,

    action text not null,

    description text,

    metadata jsonb default '{}'::jsonb,

    created_at timestamptz default now()

);
