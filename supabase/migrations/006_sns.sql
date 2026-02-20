-- =============================================
-- 006_sns.sql - SNS 자동 포스팅 기능
-- =============================================

-- SNS OAuth 연결 정보
create table if not exists sns_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null, -- 'twitter' | 'threads' | 'facebook'
  access_token  text not null,
  refresh_token text,
  token_expires_at timestamptz,
  platform_user_id text,
  platform_username text,
  platform_display_name text,
  platform_avatar text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, platform)
);

alter table sns_connections enable row level security;

create policy "sns_connections_own" on sns_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- OAuth 상태 임시 저장 (CSRF 방어)
create table if not exists sns_oauth_state (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null,
  state       text not null unique,
  code_verifier text, -- PKCE (X)
  created_at  timestamptz default now(),
  expires_at  timestamptz default (now() + interval '10 minutes')
);

alter table sns_oauth_state enable row level security;
create policy "sns_oauth_state_own" on sns_oauth_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SNS 게시물 템플릿
create table if not exists sns_post_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,       -- 내부 관리용 제목
  content     text not null,       -- 게시물 내용 (최대 280자 등 플랫폼별 제한)
  media_urls  text[] default '{}', -- 첨부 이미지/영상
  platforms   text[] default '{}', -- 게시할 플랫폼 목록
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table sns_post_templates enable row level security;
create policy "sns_post_templates_own" on sns_post_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SNS 반복 스케줄
create table if not exists sns_schedules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  template_id     uuid not null references sns_post_templates(id) on delete cascade,
  platforms       text[] not null,
  repeat_type     text not null check (repeat_type in ('hours', 'days')),
  repeat_interval integer not null check (repeat_interval > 0),
  start_at        timestamptz not null,
  end_at          timestamptz,        -- null = 무제한
  next_post_at    timestamptz not null,
  is_active       boolean default true,
  total_posted    integer default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table sns_schedules enable row level security;
create policy "sns_schedules_own" on sns_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SNS 포스팅 로그
create table if not exists sns_post_logs (
  id               uuid primary key default gen_random_uuid(),
  schedule_id      uuid references sns_schedules(id) on delete set null,
  template_id      uuid references sns_post_templates(id) on delete set null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  platform         text not null,
  status           text not null check (status in ('success', 'failed')),
  platform_post_id text,   -- 플랫폼에서 반환된 게시물 ID
  error_message    text,
  posted_at        timestamptz default now()
);

alter table sns_post_logs enable row level security;
create policy "sns_post_logs_own" on sns_post_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 인덱스
create index if not exists sns_schedules_next_post_at on sns_schedules(next_post_at) where is_active = true;
create index if not exists sns_post_logs_user_id on sns_post_logs(user_id, posted_at desc);
