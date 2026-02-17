import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, MessageCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export const revalidate = 30

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('community_posts')
    .select('*, author:profiles(username, full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // 댓글 조회
  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles(username, full_name, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  // 조회수 업데이트
  await supabase.from('community_posts').update({ view_count: post.view_count + 1 }).eq('id', id)

  const categoryLabels: Record<string, string> = {
    general: '일반',
    question: '질문',
    showcase: '쇼케이스',
    news: '뉴스',
    discussion: '토론',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/community" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        커뮤니티로 돌아가기
      </Link>

      {/* Post */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 mb-6">
        <div className="mb-4">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full">
            {categoryLabels[post.category] || post.category}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          {post.author && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm">
                {post.author.full_name?.[0] || 'U'}
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {post.author.full_name || post.author.username || '익명'}
              </span>
            </div>
          )}
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
          </span>
          <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {post.view_count + 1}</span>
          <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.like_count}</span>
        </div>

        <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          댓글 {comments?.length || 0}개
        </h2>

        <div className="space-y-4">
          {comments && comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                {comment.author?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.author?.full_name || comment.author?.username || '익명'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            댓글 작성은 로그인 후 이용 가능합니다.{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
