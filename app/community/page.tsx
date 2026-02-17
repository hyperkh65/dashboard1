import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, MessageCircle, Eye, Pin, Clock, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export const revalidate = 30

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const category = params.category

  const categories = [
    { value: 'general', label: '일반' },
    { value: 'question', label: '질문' },
    { value: 'showcase', label: '쇼케이스' },
    { value: 'news', label: '뉴스' },
    { value: 'discussion', label: '토론' },
  ]

  let query = supabase
    .from('community_posts')
    .select('*, author:profiles(username, full_name, avatar_url)')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  if (category) query = query.eq('category', category)

  const { data: posts } = await query

  const categoryColors: Record<string, string> = {
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    question: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    showcase: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    news: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    discussion: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-3">
            <Users className="w-5 h-5" />
            <span className="font-medium">커뮤니티</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">AI 커뮤니티</h1>
          <p className="text-gray-600 dark:text-gray-400">함께 배우고 성장하는 AI 커뮤니티</p>
        </div>
        <Link
          href="/community/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          글쓰기
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/community"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !category ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          전체
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.value}
            href={`/community?category=${cat.value}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {post.is_pinned && (
                      <Pin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColors[post.category] || categoryColors.general}`}>
                      {categories.find((c) => c.value === post.category)?.label || post.category}
                    </span>
                  </div>
                  <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 ${post.is_pinned ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                    {post.title}
                  </h3>
                  {post.content && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {post.content}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {post.author && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                          {post.author.full_name?.[0] || 'U'}
                        </div>
                        <span>{post.author.full_name || post.author.username || '익명'}</span>
                      </div>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {post.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> {post.comment_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-4">아직 게시글이 없습니다.</p>
            <Link href="/community/new" className="text-indigo-600 hover:underline font-medium">
              첫 번째 글을 작성해보세요!
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
