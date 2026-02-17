import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Eye, Heart, Clock, Tag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export const revalidate = 60

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('*, category:categories(*), author:profiles(username, full_name, avatar_url)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) notFound()

  // 조회수 증가
  await supabase.rpc('increment_view_count', { post_uuid: post.id })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back */}
      <Link href="/posts" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        AI 인사이트로 돌아가기
      </Link>

      {/* Header */}
      <div className="mb-8">
        {post.category && (
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
            {post.category.name}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-4 mb-4 leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {post.author && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                {post.author.full_name?.[0] || 'A'}
              </div>
              <span>{post.author.full_name || post.author.username || '관리자'}</span>
            </div>
          )}
          {post.is_bot_generated && (
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs">🤖 봇</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {post.published_at
              ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ko })
              : '방금 전'}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" /> {post.view_count + 1}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" /> {post.like_count}
          </span>
        </div>
      </div>

      {/* Cover Image */}
      {post.cover_image && (
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {post.content ? (
          <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        ) : (
          <p className="text-gray-500">콘텐츠가 없습니다.</p>
        )}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
          {post.tags.map((tag: string) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-600 dark:text-gray-400"
            >
              <Tag className="w-3.5 h-3.5" /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* Source */}
      {post.source_url && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            출처:{' '}
            <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
              {post.source_url}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
