import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, MessageSquare, HelpCircle, Sparkles, BookOpen, Crown, Eye, MessageCircle, Clock, Pin, Plus, Image as ImageIcon, Video } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import GradeBadge from '@/components/GradeBadge'
import { Grade } from '@/types'

export const revalidate = 30

const BOARDS = [
  { slug: 'all', name: '전체', icon: MessageSquare, color: '#6366f1' },
  { slug: 'notice', name: '공지사항', icon: Bell, color: '#ef4444' },
  { slug: 'general', name: '자유게시판', icon: MessageSquare, color: '#6366f1' },
  { slug: 'question', name: '질문답변', icon: HelpCircle, color: '#3b82f6' },
  { slug: 'showcase', name: 'AI 인사이트 공유', icon: Sparkles, color: '#8b5cf6' },
  { slug: 'study', name: '스터디 모집', icon: BookOpen, color: '#10b981' },
  { slug: 'vip', name: 'VIP 라운지', icon: Crown, color: '#f59e0b' },
]

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const board = params.board || 'all'

  // 현재 사용자 정보 및 등급 조회
  const { data: { user } } = await supabase.auth.getUser()
  let userProfile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('grade, is_admin')
      .eq('id', user.id)
      .single()
    userProfile = data
  }

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

  const boardInfo = BOARDS.find((b) => b.slug === board)

  const boardColors: Record<string, string> = {
    notice: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    general: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    question: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    showcase: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    study: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    vip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* 사이드바 - 게시판 목록 */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-24">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">AI 인사이트 카페</h2>
              {userProfile && (
                <div className="mt-2">
                  <GradeBadge grade={userProfile.grade as Grade} size="sm" />
                </div>
              )}
            </div>
            <nav className="p-2">
              {BOARDS.map((b) => {
                const Icon = b.icon
                const isActive = board === b.slug
                return (
                  <Link
                    key={b.slug}
                    href={b.slug === 'all' ? '/community' : `/community?board=${b.slug}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? b.color : undefined }} />
                    {b.name}
                    {b.slug === 'vip' && (
                      <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">VIP</span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* 등급 안내 */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">등급 시스템</p>
              <div className="space-y-1">
                {[
                  { emoji: '🌱', grade: '씨앗', short: '가입 직후' },
                  { emoji: '🌿', grade: '새싹', short: '7일+' },
                  { emoji: '🍃', grade: '잎새', short: '30일+' },
                  { emoji: '🌳', grade: '나무', short: '90일+' },
                  { emoji: '🍎', grade: '열매', short: '180일+' },
                  { emoji: '👑', grade: '스탭', short: '운영진' },
                ].map((g) => (
                  <div key={g.grade} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>{g.emoji}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{g.grade}</span>
                    <span className="ml-auto">{g.short}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {boardInfo?.name || '전체 게시판'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                총 {posts?.length || 0}개의 게시글
              </p>
            </div>
            <Link
              href="/community/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              글쓰기
            </Link>
          </div>

          {/* 모바일 게시판 필터 */}
          <div className="lg:hidden flex overflow-x-auto gap-2 mb-6 pb-1">
            {BOARDS.map((b) => (
              <Link
                key={b.slug}
                href={b.slug === 'all' ? '/community' : `/community?board=${b.slug}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  board === b.slug
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>

          {/* Posts List */}
          <div className="space-y-2">
            {posts && posts.length > 0 ? (
              posts.map((post) => {
                const hasMedia = post.media_urls && post.media_urls.length > 0
                const firstMedia = hasMedia ? post.media_urls[0] : null
                const isVideo = firstMedia && !firstMedia.match(/\.(jpg|jpeg|png|gif|webp)$/i)

                return (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* 미디어 썸네일 */}
                      {firstMedia && (
                        <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                          {isVideo ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <Video className="w-6 h-6 text-white" />
                            </div>
                          ) : (
                            <img src={firstMedia} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {post.is_pinned && (
                            <Pin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${boardColors[post.board_slug || 'general'] || boardColors.general}`}>
                            {BOARDS.find((b) => b.slug === post.board_slug)?.name || '자유게시판'}
                          </span>
                          {hasMedia && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <ImageIcon className="w-3 h-3" />
                              {post.media_urls.length}
                            </span>
                          )}
                        </div>

                        <h3 className={`font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate ${post.is_pinned ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                          {post.title}
                        </h3>

                        {post.content && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
                            {post.content}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {post.author && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                                {post.author.full_name?.[0] || 'U'}
                              </div>
                              <span className="text-gray-600 dark:text-gray-400">{post.author.full_name || '익명'}</span>
                              {post.author.grade && (
                                <GradeBadge grade={post.author.grade as Grade} size="sm" showLabel={false} />
                              )}
                            </div>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> {post.view_count}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" /> {post.comment_count}
                          </span>
                          <span className="flex items-center gap-0.5 ml-auto">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="mb-4">아직 게시글이 없습니다.</p>
                <Link href="/community/new" className="text-indigo-600 hover:underline font-medium">
                  첫 번째 글을 작성해보세요!
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
