-- =============================================
-- 008_blog.sql - 네이버 블로그 자동화
-- =============================================

-- 블로그 계정 (네이버 아이디/비밀번호)
create table if not exists blog_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null default 'naver',
  naver_id    text not null,
  naver_pw_enc text not null,          -- AES-256-GCM 암호화된 비밀번호
  blog_id     text,                    -- 블로그 URL ID (영문)
  blog_name   text,                    -- 블로그 이름
  is_active   boolean default true,
  last_login_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, platform, naver_id)
);

alter table blog_accounts enable row level security;
create policy "blog_accounts_own" on blog_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 블로그 포스트 (작성/예약/발행 관리)
create table if not exists blog_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid references blog_accounts(id) on delete set null,
  title         text not null,
  content       text not null,         -- HTML 또는 마크다운
  category_no   integer default 0,     -- 네이버 블로그 카테고리 번호
  tags          text[] default '{}',
  media_urls    text[] default '{}',   -- 첨부 이미지 URL
  status        text not null default 'draft'
                check (status in ('draft', 'queued', 'publishing', 'published', 'failed')),
  scheduled_at  timestamptz,           -- null이면 즉시 발행 (queued 시)
  published_at  timestamptz,
  platform_post_id text,               -- 네이버에서 반환한 포스트 logNo
  error_message text,
  retry_count   integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table blog_posts enable row level security;
create policy "blog_posts_own" on blog_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 발행 로그
create table if not exists blog_publish_logs (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references blog_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null check (status in ('success', 'failed')),
  platform_post_id text,
  error_message text,
  runner_type text default 'playwright', -- 'playwright' | 'api'
  created_at  timestamptz default now()
);

alter table blog_publish_logs enable row level security;
create policy "blog_publish_logs_own" on blog_publish_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 인덱스
create index if not exists blog_posts_user_status on blog_posts(user_id, status);
create index if not exists blog_posts_scheduled on blog_posts(scheduled_at) where status = 'queued';
create index if not exists blog_publish_logs_post on blog_publish_logs(post_id, created_at desc);
