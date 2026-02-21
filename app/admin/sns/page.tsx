import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, ArrowLeft, ExternalLink } from 'lucide-react'
import { CopyButton } from './CopyButton'

const MIGRATION_SQL = `-- Supabase SQL 에디터에 붙여넣고 실행하세요
-- =============================================
-- 006_sns.sql - SNS 자동 포스팅 기능
-- =============================================

create table if not exists sns_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  platform_user_id text,
  platform_username text,
  platform_display_name text,
  platform_avatar text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);
alter table sns_connections enable row level security;
create policy "sns_connections_own" on sns_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists sns_oauth_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  state text not null unique,
  code_verifier text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '10 minutes')
);
alter table sns_oauth_state enable row level security;
create policy "sns_oauth_state_own" on sns_oauth_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists sns_post_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  media_urls text[] default '{}',
  platforms text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table sns_post_templates enable row level security;
create policy "sns_post_templates_own" on sns_post_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists sns_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references sns_post_templates(id) on delete cascade,
  platforms text[] not null,
  repeat_type text not null check (repeat_type in ('hours', 'days')),
  repeat_interval integer not null check (repeat_interval > 0),
  start_at timestamptz not null,
  end_at timestamptz,
  next_post_at timestamptz not null,
  is_active boolean default true,
  total_posted integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table sns_schedules enable row level security;
create policy "sns_schedules_own" on sns_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists sns_post_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references sns_schedules(id) on delete set null,
  template_id uuid references sns_post_templates(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  status text not null check (status in ('success', 'failed')),
  platform_post_id text,
  error_message text,
  posted_at timestamptz default now()
);
alter table sns_post_logs enable row level security;
create policy "sns_post_logs_own" on sns_post_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists sns_schedules_next_post_at on sns_schedules(next_post_at) where is_active = true;
create index if not exists sns_post_logs_user_id on sns_post_logs(user_id, posted_at desc);`

type EnvItem = {
  key: string
  label: string
  required: boolean
}

const ENV_GROUPS: { platform: string; color: string; guide: string; items: EnvItem[] }[] = [
  {
    platform: 'X (Twitter)',
    color: 'bg-black text-white',
    guide: 'https://developer.twitter.com/en/portal/dashboard',
    items: [
      { key: 'TWITTER_CLIENT_ID', label: 'Client ID', required: true },
      { key: 'TWITTER_CLIENT_SECRET', label: 'Client Secret', required: true },
    ],
  },
  {
    platform: 'Threads',
    color: 'bg-neutral-800 text-white',
    guide: 'https://developers.facebook.com/apps/',
    items: [
      { key: 'THREADS_APP_ID', label: 'App ID', required: true },
      { key: 'THREADS_APP_SECRET', label: 'App Secret', required: true },
    ],
  },
  {
    platform: 'Facebook',
    color: 'bg-[#1877F2] text-white',
    guide: 'https://developers.facebook.com/apps/',
    items: [
      { key: 'FACEBOOK_APP_ID', label: 'App ID', required: true },
      { key: 'FACEBOOK_APP_SECRET', label: 'App Secret', required: true },
    ],
  },
  {
    platform: 'Cron (Vercel)',
    color: 'bg-indigo-600 text-white',
    guide: 'https://vercel.com/docs/cron-jobs',
    items: [
      { key: 'CRON_SECRET', label: 'Cron Secret (임의 문자열)', required: false },
    ],
  },
]

export default async function AdminSnsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.vercel.app'

  // 환경변수 설정 여부 확인 (값은 노출하지 않음)
  const envStatus: Record<string, boolean> = {}
  for (const group of ENV_GROUPS) {
    for (const item of group.items) {
      envStatus[item.key] = !!process.env[item.key]
    }
  }

  const totalRequired = ENV_GROUPS.flatMap((g) => g.items.filter((i) => i.required))
  const configuredCount = totalRequired.filter((i) => envStatus[i.key]).length
  const allConfigured = configuredCount === totalRequired.length

  const callbackUrls = [
    { platform: 'X (Twitter)', url: `${siteUrl}/api/sns/callback/twitter` },
    { platform: 'Threads', url: `${siteUrl}/api/sns/callback/threads` },
    { platform: 'Facebook', url: `${siteUrl}/api/sns/callback/facebook` },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 어드민으로 돌아가기
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold">SNS 설정 가이드</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        SNS 자동 포스팅이 작동하려면 아래 환경변수를{' '}
        <strong>Vercel 대시보드 → Project Settings → Environment Variables</strong>
        에 등록하고, Supabase에 DB 마이그레이션을 실행해야 합니다.
      </p>

      {/* 전체 상태 요약 */}
      <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${
        allConfigured ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
      }`}>
        <span className="text-2xl">{allConfigured ? '✅' : '⚠️'}</span>
        <div>
          <div className="font-semibold text-sm">
            {allConfigured
              ? '모든 필수 환경변수가 설정되었습니다!'
              : `필수 환경변수 ${configuredCount}/${totalRequired.length}개 설정됨`}
          </div>
          <div className="text-xs text-gray-500">
            변경 후에는 Vercel에서 재배포(Redeploy)가 필요합니다.
          </div>
        </div>
      </div>

      {/* Step 1: Vercel 환경변수 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">
            <span className="text-indigo-600 mr-2">Step 1.</span>
            Vercel 환경변수 등록
          </h2>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            Vercel 대시보드 열기 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-4">
          {ENV_GROUPS.map((group) => (
            <div key={group.platform} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className={`flex items-center justify-between px-4 py-2.5 ${group.color}`}>
                <span className="font-medium text-sm">{group.platform}</span>
                <a
                  href={group.guide}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
                >
                  앱 등록 가이드 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {item.key}
                      </code>
                      <span className="text-xs text-gray-400 ml-2">{item.label}</span>
                      {!item.required && (
                        <span className="text-xs text-gray-400 ml-1">(선택)</span>
                      )}
                    </div>
                    <span className="text-lg">
                      {envStatus[item.key] ? '✅' : '❌'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>등록 방법:</strong> Vercel 대시보드 → 프로젝트 선택 →{' '}
          Settings → Environment Variables → Add New → 키/값 입력 후 Save →{' '}
          Deployments 탭에서 Redeploy
        </div>
      </section>

      {/* Step 2: 콜백 URL */}
      <section className="mb-10">
        <h2 className="font-semibold text-lg mb-4">
          <span className="text-indigo-600 mr-2">Step 2.</span>
          각 플랫폼 앱에 콜백 URL 등록
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          각 개발자 콘솔의 "Redirect URI / Callback URL" 항목에 아래 URL을 추가하세요.
        </p>
        <div className="space-y-2">
          {callbackUrls.map((cb) => (
            <div
              key={cb.platform}
              className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
            >
              <div>
                <div className="text-xs text-gray-400 mb-0.5">{cb.platform}</div>
                <code className="text-sm font-mono text-gray-800 break-all">{cb.url}</code>
              </div>
              <CopyButton text={cb.url} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          * `NEXT_PUBLIC_SITE_URL` 환경변수가 실제 도메인으로 설정되어야 올바른 URL이 생성됩니다.
          현재 값: <code className="bg-gray-100 px-1 rounded">{siteUrl}</code>
        </p>
      </section>

      {/* Step 3: DB 마이그레이션 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">
            <span className="text-indigo-600 mr-2">Step 3.</span>
            Supabase DB 마이그레이션 실행
          </h2>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            Supabase 대시보드 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Supabase 대시보드 → 프로젝트 선택 → SQL Editor → 아래 SQL 붙여넣기 후 실행
        </p>

        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-x-auto max-h-64 font-mono leading-relaxed">
            {MIGRATION_SQL}
          </pre>
          <div className="absolute top-3 right-3">
            <CopyButton text={MIGRATION_SQL} label="SQL 복사" dark />
          </div>
        </div>
      </section>

      {/* Step 4: Vercel Cron 확인 */}
      <section>
        <h2 className="font-semibold text-lg mb-4">
          <span className="text-indigo-600 mr-2">Step 4.</span>
          Vercel Cron 확인
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
          <p>
            <code className="bg-gray-200 px-1.5 py-0.5 rounded">vercel.json</code>에 이미 30분 간격 Cron이 설정되어 있습니다.
            Vercel Pro 플랜 이상에서만 Cron Jobs가 동작합니다.
          </p>
          <p className="mt-2 text-gray-500 text-xs">
            무료 플랜: 외부 cron 서비스(cron-job.org 등)에서{' '}
            <code>{siteUrl}/api/sns/cron</code>을 30분마다 호출하도록 설정 가능.
          </p>
        </div>
      </section>
    </div>
  )
}
