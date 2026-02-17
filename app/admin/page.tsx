import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, FileText, BookOpen, Users, Bot, RefreshCcw, Settings } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 dark:text-gray-400">관리자 권한이 없습니다.</p>
        <Link href="/" className="text-indigo-600 hover:underline mt-4 inline-block">홈으로</Link>
      </div>
    )
  }

  // 통계 쿼리들
  const [postsResult, coursesResult, membersResult, botJobsResult] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact' }),
    supabase.from('courses').select('id', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('is_member', true),
    supabase.from('bot_jobs').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  const stats = [
    { label: '총 게시글', value: postsResult.count || 0, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: '총 강의', value: coursesResult.count || 0, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: '유료 멤버', value: membersResult.count || 0, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: '봇 작업', value: botJobsResult.data?.length || 0, icon: Bot, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  ]

  const statusColors: Record<string, string> = {
    success: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    failed: 'text-red-600 bg-red-100 dark:bg-red-900/20',
    pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    running: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">AI 인사이트 허브 관리 현황</p>
        </div>
        <Link
          href="/api-docs"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          API 문서
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">빠른 작업</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '새 게시글', href: '/admin/posts/new', icon: FileText },
              { label: '새 강의', href: '/admin/courses/new', icon: BookOpen },
              { label: '봇 실행', href: '/api-docs#bot', icon: Bot },
              { label: 'Notion 동기화', href: '/api-docs#notion', icon: RefreshCcw },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <action.icon className="w-4 h-4 text-indigo-600" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bot Jobs */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">최근 봇 작업</h2>
          <div className="space-y-3">
            {botJobsResult.data && botJobsResult.data.length > 0 ? (
              botJobsResult.data.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{job.job_type}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">봇 작업 기록이 없습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="mt-8 bg-gray-900 rounded-xl p-6 text-sm font-mono">
        <p className="text-gray-400 mb-3"># 봇으로 글 자동 올리기</p>
        <p className="text-green-400">curl -X POST {process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/bot/post \</p>
        <p className="text-green-400 pl-4">{'-H "Authorization: Bearer YOUR_BOT_API_SECRET" \\'}</p>
        <p className="text-green-400 pl-4">{'-H "Content-Type: application/json" \\'}</p>
        <p className="text-green-400 pl-4">{'--data \'{"title":"AI 뉴스","content":"내용...","category_slug":"ai-news"}\''}</p>
      </div>
    </div>
  )
}
