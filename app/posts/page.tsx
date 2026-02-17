import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, Eye, Heart, Tag, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import AdminWriteButton from '@/components/posts/AdminWriteButton'

export const revalidate = 60

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const categorySlug = params.category
  const page = parseInt(params.page || '1')
  const pageSize = 12

  // 카테고리 목록
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  // 게시글 목록
  let query = supabase
    .from('posts')
    .select('*, category:categories(*), author:profiles(username, full_name, avatar_url)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (categorySlug) {
    const cat = categories?.find((c) => c.slug === categorySlug)
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data: posts, count } = await query

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3">
          <TrendingUp className="w-5 h-5" />
          <span className="font-medium">AI 인사이트</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              최신 AI 인사이트 & 뉴스
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              매일 업데이트되는 최신 AI 트렌드와 인사이트를 만나보세요
            </p>
          </div>
          <AdminWriteButton />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/posts"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !categorySlug
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50'
          }`}
        >
          전체
        </Link>
        {categories?.map((cat) => (
          <Link
            key={cat.id}
            href={`/posts?category=${cat.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categorySlug === cat.slug
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Posts Grid */}
      {posts && posts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden card-hover block"
            >
              {post.cover_image ? (
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="w-12 h-12 text-indigo-300" />
                </div>
              )}
              <div className="p-5">
                {post.category && (
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full">
                    {post.category.name}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white mt-3 mb-2 line-clamp-2 leading-snug">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {post.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {post.like_count}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.published_at
                      ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ko })
                      : '방금 전'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>아직 게시글이 없습니다. 곧 업데이트됩니다!</p>
        </div>
      )}
    </div>
  )
}
