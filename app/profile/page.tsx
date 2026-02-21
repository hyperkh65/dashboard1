import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Eye,
  Heart,
  Clock,
  Coins,
  BarChart2,
  ChevronRight,
  LogIn,
} from 'lucide-react'
import GradeBadge from '@/components/GradeBadge'
import { GRADE_INFO, GRADE_ORDER, GRADE_REQUIREMENTS, type Grade, type PointLog } from '@/types'

export const dynamic = 'force-dynamic'

const BOARD_NAMES: Record<string, string> = {
  notice: '공지사항',
  intro: '가입인사',
  general: '자유게시판',
  question: '질문답변',
  showcase: 'AI 인사이트 공유',
  study: '스터디 모집',
  vip: 'VIP 라운지',
}

const POINT_REF_ICON: Record<string, string> = {
  post: '✍️',
  comment: '💬',
  like: '❤️',
  login: '📅',
  bonus: '🎁',
  video: '🎬',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, pointLogsResult, myPostsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),

    supabase
      .from('point_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('community_posts')
      .select('id, title, board_slug, view_count, like_count, comment_count, created_at')
      .eq('author_id', user.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const profile = profileResult.data
  if (!profile) redirect('/login')

  const pointLogs: PointLog[] = pointLogsResult.data || []
  const myPosts = myPostsResult.data || []

  // 등급 진행도 계산
  const grade = (profile.grade || '씨앗') as Grade
  const joinedDays = differenceInDays(new Date(), new Date(profile.cafe_joined_at || profile.created_at))
  const activity = (profile.post_count || 0) + (profile.comment_count || 0)

  const currentGradeIdx = GRADE_ORDER.indexOf(grade)
  const nextGrade = grade !== 'staff' ? GRADE_ORDER[currentGradeIdx + 1] : null
  const nextReq = nextGrade ? GRADE_REQUIREMENTS.find((r) => r.grade === nextGrade) : null

  let progressPct = 100
  if (nextReq && nextGrade !== 'staff') {
    const daysPct = nextReq.minDays > 0 ? Math.min(joinedDays / nextReq.minDays, 1) : 1
    const actPct = nextReq.minActivity > 0 ? Math.min(activity / nextReq.minActivity, 1) : 1
    progressPct = Math.round(((daysPct + actPct) / 2) * 100)
  }

  const gradeInfo = GRADE_INFO[grade]
  const nextGradeInfo = nextGrade ? GRADE_INFO[nextGrade] : null

  const displayName = profile.full_name || profile.username || user.email?.split('@')[0] || '사용자'
  const initials = displayName[0]?.toUpperCase() || '?'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

      {/* ─── 프로필 헤더 ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* 아바타 */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-indigo-100 dark:ring-indigo-900">
              {initials}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
            {profile.username && (
              <span className="text-sm text-gray-400">@{profile.username}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
            <GradeBadge grade={grade} size="md" />
            {profile.is_admin && (
              <span className="text-xs px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full font-medium">
                관리자
              </span>
            )}
            {profile.is_member && (
              <span className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                멤버
              </span>
            )}
          </div>
          {profile.bio && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{profile.bio}</p>
          )}
          <p className="text-xs text-gray-400 flex items-center gap-1 justify-center sm:justify-start">
            <Clock className="w-3.5 h-3.5" />
            가입 {joinedDays}일째 · {new Date(profile.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* 포인트 */}
        <div className="flex-shrink-0 text-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-5 py-3">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {(profile.points || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">보유 포인트</div>
          <div className="text-xs text-gray-400 mt-1">
            누적 {(profile.total_points || 0).toLocaleString()}P
          </div>
        </div>
      </div>

      {/* ─── 활동 통계 ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '작성 글', value: profile.post_count || 0, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: '댓글', value: profile.comment_count || 0, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: '누적 포인트', value: profile.total_points || 0, icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: '방문 수', value: profile.visit_count || 0, icon: LogIn, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">

        {/* ─── 등급 현황 ─── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            등급 현황
          </h2>

          {/* 현재 등급 */}
          <div className={`flex items-center gap-3 p-3 rounded-xl ${gradeInfo.bg} mb-4`}>
            <span className="text-3xl">{gradeInfo.emoji}</span>
            <div>
              <div className={`font-bold ${gradeInfo.color}`}>{gradeInfo.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{gradeInfo.desc}</div>
            </div>
          </div>

          {/* 다음 등급 진행도 */}
          {nextGrade && nextReq && nextGradeInfo ? (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>다음 등급: {nextGradeInfo.emoji} {nextGradeInfo.label}</span>
                <span className="font-medium">{progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <span>가입 기간</span>
                  <span className={joinedDays >= nextReq.minDays ? 'text-green-600 font-medium' : ''}>
                    {joinedDays}일 / {nextReq.minDays}일
                    {joinedDays >= nextReq.minDays ? ' ✓' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>활동 (글+댓글)</span>
                  <span className={activity >= nextReq.minActivity ? 'text-green-600 font-medium' : ''}>
                    {activity}회 / {nextReq.minActivity}회
                    {activity >= nextReq.minActivity ? ' ✓' : ''}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-400">
              최고 등급입니다 🎉
            </div>
          )}

          {/* 전체 등급 로드맵 */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              {GRADE_ORDER.filter((g) => g !== 'staff').map((g, idx) => {
                const info = GRADE_INFO[g]
                const isCurrent = g === grade
                const isPast = GRADE_ORDER.indexOf(g) < GRADE_ORDER.indexOf(grade)
                return (
                  <div key={g} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-lg transition-transform ${isCurrent ? 'scale-125' : isPast ? 'opacity-60' : 'opacity-30'}`}
                        title={info.desc}
                      >
                        {info.emoji}
                      </span>
                      <span className={`text-[10px] ${isCurrent ? info.color + ' font-bold' : 'text-gray-400'}`}>
                        {info.label}
                      </span>
                    </div>
                    {idx < 4 && (
                      <div className={`w-6 h-0.5 mx-0.5 mb-4 rounded ${isPast ? 'bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── 포인트 이력 ─── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            포인트 이력
          </h2>

          {pointLogs.length > 0 ? (
            <div className="space-y-2">
              {pointLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base flex-shrink-0">
                      {POINT_REF_ICON[log.ref_type || ''] || '💰'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{log.reason}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ml-3 ${log.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {log.points > 0 ? '+' : ''}{log.points}P
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
              포인트 이력이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* ─── 내가 쓴 글 ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            내가 쓴 글
            <span className="text-sm text-gray-400 font-normal ml-1">({myPosts.length})</span>
          </h2>
          <Link
            href="/community"
            className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
          >
            커뮤니티 가기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {myPosts.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {myPosts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="flex items-start justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mb-1">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">
                      {BOARD_NAMES[post.board_slug] || post.board_slug}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> {post.view_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" /> {post.like_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" /> {post.comment_count}
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400 mt-0.5">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            아직 작성한 글이 없습니다
            <div className="mt-3">
              <Link href="/community/new" className="text-indigo-600 hover:underline text-sm">
                첫 글 작성하기 →
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
