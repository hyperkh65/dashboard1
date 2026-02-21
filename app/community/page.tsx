import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, MessageSquare, HelpCircle, Sparkles, BookOpen, Crown, Eye, MessageCircle, Clock, Pin, Plus, Image as ImageIcon, Video, Lock, Hand } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import GradeBadge from '@/components/GradeBadge'
import { Grade, gradeGte, Board } from '@/types'
import { isMobile } from '@/lib/mobile'

export const revalidate = 30

const BOARD_ICONS: Record<string, any> = {
  Bell, MessageSquare, HelpCircle, Sparkles, BookOpen, Crown, Hand,
}

const BOARD_COLORS: Record<string, string> = {
  notice: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  intro: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  general: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  question: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  showcase: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  study: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  vip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const board = params.board || 'all'
  const mobile = await isMobile()

  // 사용자 정보
  const { data: { user } } = await supabase.auth.getUser()
  let userProfile: { grade: Grade; is_admin: boolean; points: number } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('grade, is_admin, points')
      .eq('id', user.id)
      .single()
    userProfile = data as any
  }

  // 게시판 목록 (DB에서)
  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  const boardList: Board[] = boards || []

  // 현재 게시판 정보
  const currentBoard = boardList.find((b) => b.slug === board)

  // 접근 권한 체크
  const canAccess = (b: Board): boolean => {
    if (b.read_permission === 'all') return true
    if (!user) return false
    if (b.read_permission === 'member') return true
    if (!userProfile) return false
    if (userProfile.is_admin) return true
    if (!gradeGte(userProfile.grade, b.read_permission)) return false
    if (b.min_points > 0 && userProfile.points < b.min_points) return false
    return true
  }

  // 현재 게시판 접근 불가 처리
  if (board !== 'all' && currentBoard && !canAccess(currentBoard)) {
    const needLogin = !user
    const needGrade = user && currentBoard.read_permission !== 'all' && currentBoard.read_permission !== 'member'
    const needPoints = user && currentBoard.min_points > 0

    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">접근 권한이 없습니다</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {needLogin && '로그인 후 이용할 수 있습니다.'}
          {needGrade && `이 게시판은 ${currentBoard.read_permission} 이상 등급이 필요합니다.`}
          {needPoints && ` (최소 ${currentBoard.min_points} 포인트 필요)`}
        </p>
        {needLogin ? (
          <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
            로그인 하기
          </Link>
        ) : (
          <Link href="/community" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
            전체 게시판으로
          </Link>
        )}
      </div>
    )
  }

  // 게시글 조회
  let query = supabase
    .from('community_posts')
    .select('*, author:profiles(username, full_name, avatar_url, grade)')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (board !== 'all') {
    query = query.eq('board_slug', board)
  }

  const { data: posts } = await query

  // 모바일 레이아웃
  if (mobile) {
    return (
      <div className="pb-4">
        {/* 게시판 탭 (수평 스크롤) */}
        <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
          <Link
            href="/community"
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${board === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
          >
            전체
          </Link>
          {boardList.map((b) => {
            const accessible = canAccess(b)
            return (
              <Link
                key={b.slug}
                href={accessible ? `/community?board=${b.slug}` : '#'}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  board === b.slug ? 'bg-indigo-600 text-white' :
                  accessible ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                  'bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600'
                }`}
              >
                {!accessible && <Lock className="w-2.5 h-2.5" />}
                {b.name}
              </Link>
            )
          })}
        </div>

        {/* 게시글 목록 */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {posts && posts.length > 0 ? posts.map((post) => {
            const hasMedia = post.media_urls && post.media_urls.length > 0
            const firstMedia = hasMedia ? post.media_urls[0] : null
            const isVideoMedia = firstMedia && firstMedia.match(/\.(mp4|webm|mov)$/i)

            return (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800"
              >
                {/* 썸네일 */}
                {firstMedia ? (
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {isVideoMedia ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <img src={firstMedia} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 mt-0.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                    {post.author?.full_name?.[0] || 'U'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {post.is_pinned && <Pin className="w-3 h-3 text-indigo-500" />}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${BOARD_COLORS[post.board_slug] || BOARD_COLORS.general}`}>
                      {boardList.find((b) => b.slug === post.board_slug)?.name || '자유'}
                    </span>
                    {hasMedia && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <ImageIcon className="w-3 h-3" />{post.media_urls.length}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1.5 ${post.is_pinned ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      {post.author?.grade && (
                        <GradeBadge grade={post.author.grade as Grade} size="sm" showLabel={false} />
                      )}
                      <span>{post.author?.full_name || '익명'}</span>
                    </div>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.view_count}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.comment_count}</span>
                    <span className="ml-auto flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                </div>
              </Link>
            )
          }) : (
            <div className="text-center py-20 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">아직 게시글이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 데스크탑 레이아웃
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* 사이드바 */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-24">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">AI 인사이트 카페</h2>
              {userProfile && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <GradeBadge grade={userProfile.grade} size="sm" />
                  <span className="text-xs text-amber-600 font-medium">⭐ {userProfile.points}P</span>
                </div>
              )}
            </div>
            <nav className="p-2">
              <Link
                href="/community"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  board === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                전체 게시판
              </Link>
              {boardList.map((b) => {
                const accessible = canAccess(b)
                const isActive = board === b.slug
                const Icon = BOARD_ICONS[b.icon] || MessageSquare
                return (
                  <Link
                    key={b.slug}
                    href={accessible ? `/community?board=${b.slug}` : '#'}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                      : accessible ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? b.color : undefined }} />
                    <span className="flex-1">{b.name}</span>
                    {!accessible && <Lock className="w-3 h-3 flex-shrink-0" />}
                    {accessible && b.min_points > 0 && (
                      <span className="text-xs text-amber-500">⭐{b.min_points}</span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* 포인트 & 등급 안내 */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">포인트 획득</p>
                {[
                  { emoji: '✍️', label: '게시글 작성', pts: '+10P' },
                  { emoji: '💬', label: '댓글 작성', pts: '+5P' },
                  { emoji: '❤️', label: '좋아요 받음', pts: '+2P' },
                ].map((a) => (
                  <div key={a.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{a.emoji}</span>
                    <span>{a.label}</span>
                    <span className="ml-auto text-amber-500 font-medium">{a.pts}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">등급 시스템</p>
                {[
                  { emoji: '🌱', g: '씨앗', short: '가입 직후' },
                  { emoji: '🌿', g: '새싹', short: '7일+' },
                  { emoji: '🍃', g: '잎새', short: '30일+' },
                  { emoji: '🌳', g: '나무', short: '90일+' },
                  { emoji: '🍎', g: '열매', short: '180일+' },
                  { emoji: '👑', g: '스탭', short: '운영진' },
                ].map((g) => (
                  <div key={g.g} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{g.emoji}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{g.g}</span>
                    <span className="ml-auto">{g.short}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {board === 'all' ? '전체 게시판' : currentBoard?.name || board}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">총 {posts?.length || 0}개의 게시글</p>
            </div>
            <Link
              href="/community/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> 글쓰기
            </Link>
          </div>

          {/* 모바일 게시판 탭 */}
          <div className="lg:hidden flex overflow-x-auto gap-2 mb-5 pb-1 scrollbar-hide">
            <Link href="/community" className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${board === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>전체</Link>
            {boardList.map((b) => (
              <Link key={b.slug} href={canAccess(b) ? `/community?board=${b.slug}` : '#'}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${board === b.slug ? 'bg-indigo-600 text-white' : canAccess(b) ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : 'bg-gray-50 text-gray-300'}`}
              >
                {!canAccess(b) && <Lock className="w-2.5 h-2.5" />}{b.name}
              </Link>
            ))}
          </div>

          {/* 게시글 목록 */}
          <div className="space-y-2">
            {posts && posts.length > 0 ? posts.map((post) => {
              const hasMedia = post.media_urls && post.media_urls.length > 0
              const firstMedia = hasMedia ? post.media_urls[0] : null
              const isVideoMedia = firstMedia && firstMedia.match(/\.(mp4|webm|mov)$/i)

              return (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {firstMedia && (
                      <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {isVideoMedia ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800"><Video className="w-6 h-6 text-white" /></div>
                        ) : (
                          <img src={firstMedia} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {post.is_pinned && <Pin className="w-3.5 h-3.5 text-indigo-500" />}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BOARD_COLORS[post.board_slug] || BOARD_COLORS.general}`}>
                          {boardList.find((b) => b.slug === post.board_slug)?.name || '자유게시판'}
                        </span>
                        {hasMedia && <span className="text-xs text-gray-400 flex items-center gap-0.5"><ImageIcon className="w-3 h-3" />{post.media_urls.length}</span>}
                      </div>
                      <h3 className={`font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate ${post.is_pinned ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                        {post.title}
                      </h3>
                      {post.content && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{post.content}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {post.author && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                              {post.author.full_name?.[0] || 'U'}
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">{post.author.full_name || '익명'}</span>
                            {post.author.grade && <GradeBadge grade={post.author.grade as Grade} size="sm" showLabel={false} />}
                          </div>
                        )}
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.view_count}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.comment_count}</span>
                        <span className="flex items-center gap-0.5 ml-auto"><Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }) : (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="mb-4">아직 게시글이 없습니다.</p>
                <Link href="/community/new" className="text-indigo-600 hover:underline font-medium">첫 번째 글을 작성해보세요!</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
