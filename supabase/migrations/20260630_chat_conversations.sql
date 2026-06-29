-- Adds conversation grouping to chat_history so multiple separate
-- chat threads can be saved and resumed independently.
-- Non-destructive: existing messages are grouped into one legacy thread.

begin;

alter table public.chat_history add column if not exists conversation_id uuid;

do $$
declare
  legacy_id uuid := gen_random_uuid();
begin
  update public.chat_history set conversation_id = legacy_id where conversation_id is null;
end $$;

alter table public.chat_history alter column conversation_id set not null;

create index if not exists chat_history_conversation_idx
on public.chat_history(user_id, conversation_id, created_at);

commit;
