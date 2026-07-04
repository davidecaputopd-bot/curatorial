-- Adds neutral content classification to the personal Inbox.
-- Existing notes stay valid and are classified by the application when read.

begin;

alter table public.inbox_items
add column if not exists note_type text;

alter table public.inbox_items
drop constraint if exists inbox_items_note_type_check;

alter table public.inbox_items
add constraint inbox_items_note_type_check
check (
  note_type is null or
  note_type in ('note', 'idea', 'link', 'reference', 'quote', 'reminder')
);

create index if not exists inbox_items_user_note_type_idx
on public.inbox_items(user_id, note_type, created_at desc);

commit;
