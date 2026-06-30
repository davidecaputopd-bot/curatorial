-- Adds OG preview fields to inbox_items so previews are stored at save time
-- (server-side, like Telegram/Slack/iMessage) instead of fetched by the client.
begin;
alter table public.inbox_items add column if not exists og_title text;
alter table public.inbox_items add column if not exists og_description text;
alter table public.inbox_items add column if not exists og_image text;
commit;
