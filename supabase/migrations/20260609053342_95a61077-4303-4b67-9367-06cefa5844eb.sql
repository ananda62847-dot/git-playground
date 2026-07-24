
-- ============ Enums ============
do $$ begin
  create type public.blueprint_task_status as enum ('pending','in_progress','blocked','done','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.blueprint_task_priority as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.blueprint_audit_action as enum (
    'generated','regenerated','task_added','task_removed','task_reordered',
    'task_edited','task_started','task_completed','task_blocked','task_skipped',
    'owner_changed','due_changed','proof_uploaded'
  );
exception when duplicate_object then null; end $$;

-- ============ resolution_blueprints ============
create table if not exists public.resolution_blueprints (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  version int not null default 1,
  title text,
  case_summary text,
  responsible_department text,
  estimated_days int,
  generated_by text not null default 'ai',
  model text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (problem_id, version)
);

create index if not exists idx_blueprints_problem on public.resolution_blueprints(problem_id) where is_active;

grant select, insert, update, delete on public.resolution_blueprints to authenticated;
grant all on public.resolution_blueprints to service_role;
grant select on public.resolution_blueprints to anon;

alter table public.resolution_blueprints enable row level security;

create policy "blueprints_select_public_or_assigned"
  on public.resolution_blueprints for select
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = resolution_blueprints.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
    or public.can_view_assignment(resolution_blueprints.problem_id)
  );

create policy "blueprints_admin_write"
  on public.resolution_blueprints for all
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = resolution_blueprints.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = resolution_blueprints.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
  );

create trigger trg_blueprints_updated_at before update on public.resolution_blueprints
  for each row execute function public.update_updated_at_column();

-- ============ blueprint_tasks ============
create table if not exists public.blueprint_tasks (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.resolution_blueprints(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  seq int not null,
  title text not null,
  objective text,
  owner_role text,
  owner_cadre_id uuid references public.cadres(id) on delete set null,
  owner_team_id uuid references public.teams(id) on delete set null,
  priority public.blueprint_task_priority not null default 'medium',
  due_in_hours int,
  due_at timestamptz,
  depends_on uuid[] not null default '{}',
  evidence_required text[] not null default '{}',
  success_criteria text[] not null default '{}',
  status public.blueprint_task_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  completed_by_cadre_id uuid references public.cadres(id) on delete set null,
  proof_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_btasks_blueprint on public.blueprint_tasks(blueprint_id, seq);
create index if not exists idx_btasks_problem on public.blueprint_tasks(problem_id);
create index if not exists idx_btasks_owner_cadre on public.blueprint_tasks(owner_cadre_id) where owner_cadre_id is not null;
create index if not exists idx_btasks_owner_team on public.blueprint_tasks(owner_team_id) where owner_team_id is not null;
create index if not exists idx_btasks_status on public.blueprint_tasks(status);

grant select, insert, update, delete on public.blueprint_tasks to authenticated;
grant all on public.blueprint_tasks to service_role;
grant select on public.blueprint_tasks to anon;

alter table public.blueprint_tasks enable row level security;

create policy "btasks_select"
  on public.blueprint_tasks for select
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = blueprint_tasks.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
    or public.can_view_assignment(blueprint_tasks.problem_id)
  );

create policy "btasks_cadre_update_own"
  on public.blueprint_tasks for update
  using (
    public.can_edit_assignment(blueprint_tasks.problem_id)
    and (
      owner_cadre_id = public.current_cadre_id()
      or (owner_team_id is not null and public.is_current_cadre_in_team(owner_team_id))
      or owner_cadre_id is null
    )
  )
  with check (
    public.can_edit_assignment(blueprint_tasks.problem_id)
  );

create policy "btasks_admin_all"
  on public.blueprint_tasks for all
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = blueprint_tasks.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = blueprint_tasks.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
  );

create trigger trg_btasks_updated_at before update on public.blueprint_tasks
  for each row execute function public.update_updated_at_column();

-- ============ blueprint_audit_log ============
create table if not exists public.blueprint_audit_log (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.resolution_blueprints(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  task_id uuid references public.blueprint_tasks(id) on delete set null,
  action public.blueprint_audit_action not null,
  actor_cadre_id uuid references public.cadres(id) on delete set null,
  actor_user_id uuid,
  actor_label text,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_baudit_blueprint on public.blueprint_audit_log(blueprint_id, created_at desc);
create index if not exists idx_baudit_problem on public.blueprint_audit_log(problem_id, created_at desc);

grant select, insert on public.blueprint_audit_log to authenticated;
grant all on public.blueprint_audit_log to service_role;
grant select on public.blueprint_audit_log to anon;

alter table public.blueprint_audit_log enable row level security;

create policy "baudit_select"
  on public.blueprint_audit_log for select
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = blueprint_audit_log.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
    or public.can_view_assignment(blueprint_audit_log.problem_id)
  );

create policy "baudit_insert"
  on public.blueprint_audit_log for insert
  with check (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.moderator_constituencies mc
               join public.problems p on p.id = blueprint_audit_log.problem_id
               where mc.user_id = auth.uid() and mc.constituency = p.constituency)
    or public.can_view_assignment(blueprint_audit_log.problem_id)
  );

-- ============ Audit trigger on task changes ============
create or replace function public.btasks_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _action public.blueprint_audit_action;
  _before jsonb := null;
  _after jsonb := null;
  _task_id uuid;
  _bp uuid;
  _prob uuid;
begin
  if tg_op = 'INSERT' then
    _action := 'task_added'; _after := to_jsonb(new);
    _task_id := new.id; _bp := new.blueprint_id; _prob := new.problem_id;
  elsif tg_op = 'DELETE' then
    _action := 'task_removed'; _before := to_jsonb(old);
    _task_id := old.id; _bp := old.blueprint_id; _prob := old.problem_id;
  else
    _before := to_jsonb(old); _after := to_jsonb(new);
    _task_id := new.id; _bp := new.blueprint_id; _prob := new.problem_id;
    if new.status is distinct from old.status then
      _action := case new.status
        when 'in_progress' then 'task_started'::public.blueprint_audit_action
        when 'done' then 'task_completed'::public.blueprint_audit_action
        when 'blocked' then 'task_blocked'::public.blueprint_audit_action
        when 'skipped' then 'task_skipped'::public.blueprint_audit_action
        else 'task_edited'::public.blueprint_audit_action
      end;
    elsif (new.owner_cadre_id is distinct from old.owner_cadre_id)
       or (new.owner_team_id is distinct from old.owner_team_id) then
      _action := 'owner_changed';
    elsif new.due_at is distinct from old.due_at then
      _action := 'due_changed';
    elsif new.seq is distinct from old.seq then
      _action := 'task_reordered';
    elsif coalesce(array_length(new.proof_urls,1),0) > coalesce(array_length(old.proof_urls,1),0) then
      _action := 'proof_uploaded';
    else
      _action := 'task_edited';
    end if;
  end if;

  insert into public.blueprint_audit_log(blueprint_id, problem_id, task_id, action, actor_user_id, before, after)
  values (_bp, _prob, _task_id, _action, auth.uid(), _before, _after);

  return coalesce(new, old);
end $$;

drop trigger if exists trg_btasks_audit on public.blueprint_tasks;
create trigger trg_btasks_audit
  after insert or update or delete on public.blueprint_tasks
  for each row execute function public.btasks_audit();

-- ============ Auto-resolve when all tasks done ============
create or replace function public.btasks_maybe_close_problem()
returns trigger language plpgsql security definer set search_path = public as $$
declare _remaining int; _pstatus text;
begin
  if new.status <> 'done' then return new; end if;
  select status into _pstatus from public.problems where id = new.problem_id;
  if _pstatus in ('resolved','completed','citizen_confirmed','rejected','duplicate') then return new; end if;

  select count(*) into _remaining
    from public.blueprint_tasks
    where blueprint_id = new.blueprint_id
      and status not in ('done','skipped');

  if _remaining = 0 then
    update public.problems
      set status = 'resolved', resolved_at = coalesce(resolved_at, now())
      where id = new.problem_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_btasks_maybe_close on public.blueprint_tasks;
create trigger trg_btasks_maybe_close
  after update of status on public.blueprint_tasks
  for each row when (new.status = 'done')
  execute function public.btasks_maybe_close_problem();

-- ============ Auto-fire AI edge functions via pg_net ============
-- Helper: fire-and-forget HTTP POST to an edge function with anon key
create or replace function public.fire_edge_fn(_fn text, _body jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare _req_id bigint;
begin
  begin
    select net.http_post(
      url := 'https://ifvktibgarrprfbwuupe.supabase.co/functions/v1/' || _fn,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmdmt0aWJnYXJycHJmYnd1dXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDY5NjIsImV4cCI6MjA5NTM4Mjk2Mn0.bSS8deKzZNXVuOVUgndX-M8BMsT-kL4lg-cieTANFaM',
        'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmdmt0aWJnYXJycHJmYnd1dXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDY5NjIsImV4cCI6MjA5NTM4Mjk2Mn0.bSS8deKzZNXVuOVUgndX-M8BMsT-kL4lg-cieTANFaM'
      ),
      body := _body
    ) into _req_id;
  exception when others then
    -- swallow: never block app on missing extension or network issues
    return null;
  end;
  return _req_id;
end $$;

-- Trigger: new problem → duplicate-detect + blueprint generation
create or replace function public.on_problem_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.fire_edge_fn('ai-duplicate-detect', jsonb_build_object('problem_id', new.id));
  perform public.fire_edge_fn('ai-resolution-blueprint', jsonb_build_object('problem_id', new.id));
  return new;
end $$;

drop trigger if exists trg_problem_inserted on public.problems;
create trigger trg_problem_inserted
  after insert on public.problems
  for each row execute function public.on_problem_inserted();

-- Trigger: proof uploaded → verify
create or replace function public.on_update_proof()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.before_url is not null and new.after_url is not null then
    perform public.fire_edge_fn('ai-verify-proof', jsonb_build_object('problem_id', new.problem_id, 'update_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists trg_update_proof on public.problem_updates;
create trigger trg_update_proof
  after insert on public.problem_updates
  for each row execute function public.on_update_proof();

-- Trigger: problem closed → draft DOCX
create or replace function public.on_problem_closed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('resolved','completed','citizen_confirmed')
     and (old.status is null or old.status not in ('resolved','completed','citizen_confirmed'))
     and new.completion_report_url is null then
    perform public.fire_edge_fn('ai-draft-report-docx', jsonb_build_object('problem_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists trg_problem_closed on public.problems;
create trigger trg_problem_closed
  after update of status on public.problems
  for each row execute function public.on_problem_closed();
