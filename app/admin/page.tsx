import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, FileText, BookOpen, Users, Bot, RefreshCcw, Settings, LayoutList, Crown, Shield, Globe, Share2 } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name, grade')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">관리자 권한이 없습니다.</p>
        <p className="text-sm text-gray-400">관리자 계정: 2days.kr@gmail.com</p>
        <Link href="/" className="text-indigo-600 hover:underline mt-4 inline-block">홈으로</Link>
      </div>
    )
  }

  // 통계 쿼리들
  const [postsResult, coursesResult, membersResult, communityResult, botJobsResult, gradeStatsResult] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact' }),
    supabase.from('courses').select('id', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('community_posts').select('id', { count: 'exact' }),
    supabase.from('bot_jobs').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('grade'),
  ])

  // 등급별 통계
  const gradeStats = (gradeStatsResult.data || []).reduce((acc: Record<string, number>, p) => {
    const g = p.grade || '씨앗'
    acc[g] = (acc[g] || 0) + 1
    return acc
  }, {})

  const stats = [
    { label: '총 게시글 (AI 인사이트)', value: postsResult.count || 0, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: '강의', value: coursesResult.count || 0, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: '전체 멤버', value: membersResult.count || 0, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: '커뮤니티 게시글', value: communityResult.count || 0, icon: LayoutList, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  ]

  const statusColors: Record<string, string> = {
    success: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    failed: 'text-red-600 bg-red-100 dark:bg-red-900/20',
    pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    running: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  }

  const GRADE_DISPLAY = [
    { key: '씨앗', emoji: '🌱' },
    { key: '새싹', emoji: '🌿' },
    { key: '잎새', emoji: '🍃' },
    { key: '나무', emoji: '🌳' },
    { key: '열매', emoji: '🍎' },
    { key: 'staff', emoji: '👑' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            AI 인사이트 카페 · 관리자: {profile.full_name || user.email} 👑
          </p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 빠른 작업 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">빠른 작업</h2>
          <div className="space-y-2">
            {[
              { label: '사이트 관리', href: '/admin/sites', icon: Globe, desc: '추천 사이트 추가/관리' },
              { label: '게시판 권한 관리', href: '/admin/boards', icon: LayoutList, desc: '읽기/쓰기 권한 설정' },
              { label: '멤버 등급 관리', href: '/admin/members', icon: Crown, desc: '등급 수동 조정' },
              { label: 'AI 인사이트 새 글', href: '/admin/posts/new', icon: FileText, desc: '인사이트 발행' },
              { label: '새 강의', href: '/admin/courses/new', icon: BookOpen, desc: '강의 추가' },
              { label: '봇 실행', href: '/api-docs#bot', icon: Bot, desc: 'AI 콘텐츠 자동화' },
              { label: 'Notion 동기화', href: '/api-docs#notion', icon: RefreshCcw, desc: '백업 동기화' },
              { label: 'SNS 설정', href: '/admin/sns', icon: Share2, desc: 'X·Threads·Facebook 연동 설정' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
              >
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <action.icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</div>
                  <div className="text-xs text-gray-400">{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 등급 현황 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">멤버 등급 현황</h2>
          <div className="space-y-3">
            {GRADE_DISPLAY.map(({ key, emoji }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{key === 'staff' ? '스탭' : key}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{gradeStats[key] || 0}명</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${membersResult.count ? ((gradeStats[key] || 0) / membersResult.count) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/admin/members"
            className="block text-center mt-4 text-sm text-indigo-600 hover:underline"
          >
            전체 멤버 관리 →
          </Link>
        </div>

        {/* Bot Jobs */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">최근 봇 작업</h2>
          <div className="space-y-3">
            {botJobsResult.data && botJobsResult.data.length > 0 ? (
              botJobsResult.data.map((job) => (
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

          {/* 관리자 안내 */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-2 font-medium">관리자 정보</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>이메일: 2days.kr@gmail.com</div>
              <div>등급: 👑 스탭 (관리자)</div>
            </div>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="mt-6 bg-gray-900 rounded-xl p-5 text-sm font-mono">
        <p className="text-gray-400 mb-2 text-xs"># AI 인사이트 봇으로 글 자동 올리기</p>
        <p className="text-green-400 text-xs">curl -X POST {process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/bot/post \</p>
        <p className="text-green-400 pl-4 text-xs">{'-H "Authorization: Bearer YOUR_BOT_API_SECRET" \\'}</p>
        <p className="text-green-400 pl-4 text-xs">{'-H "Content-Type: application/json" \\'}</p>
        <p className="text-green-400 pl-4 text-xs">{'--data \'{"title":"AI 뉴스","content":"내용...","category_slug":"ai-news"}\''}</p>
      </div>
    </div>
  )
}
