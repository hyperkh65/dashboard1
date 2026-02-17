import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, Eye, Heart, Tag, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import AdminWriteButton from '@/components/posts/AdminWriteButton'
import NewsletterForm from '@/components/NewsletterForm'

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

      {/* Newsletter Banner */}
      <div className="mt-20 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-1">
        <div className="relative rounded-[22px] bg-white dark:bg-gray-950 px-8 py-12 md:px-16 md:py-16 text-center">
          {/* 배경 장식 */}
          <div className="absolute inset-0 overflow-hidden rounded-[22px] pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              무료 뉴스레터
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 leading-tight">
              새 AI 인사이트,<br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                메일로 바로 받아보세요
              </span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-8 max-w-lg mx-auto">
              새 글이 올라올 때마다 이메일로 알려드립니다.<br className="hidden md:block" />
              스팸 없음 · 언제든 구독 취소 가능
            </p>

            <div className="max-w-md mx-auto">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
