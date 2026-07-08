alter table notifications
add column if not exists priority text default 'normal';

alter table notifications
add column if not exists icon text default '🔔';

alter table notifications
add column if not exists action_url text;

alter table notifications
add column if not exists expires_at timestamptz;
