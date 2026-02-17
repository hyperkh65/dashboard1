'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, MessageCircle, Clock, Send, Image as ImageIcon, Play, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import GradeBadge from '@/components/GradeBadge'
import { Grade } from '@/types'

const BOARD_NAMES: Record<string, string> = {
  notice: '공지사항',
  general: '자유게시판',
  question: '질문답변',
  showcase: 'AI 인사이트 공유',
  study: '스터디 모집',
  vip: 'VIP 라운지',
}

export default function CommunityPostPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [lightboxMedia, setLightboxMedia] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      const { data: postData } = await supabase
        .from('community_posts')
        .select('*, author:profiles(id, username, full_name, avatar_url, grade, post_count, comment_count, cafe_joined_at)')
        .eq('id', id)
        .single()

      if (!postData) {
        router.push('/community')
        return
      }

      setPost(postData)

      // 조회수 업데이트
      await supabase
        .from('community_posts')
        .update({ view_count: (postData.view_count || 0) + 1 })
        .eq('id', id)

      // 댓글 조회
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, author:profiles(username, full_name, avatar_url, grade)')
        .eq('post_id', id)
        .order('created_at', { ascending: true })

      setComments(commentsData || [])
      setLoading(false)
    }

    load()
  }, [id])

  const handleLike = async () => {
    if (!user || !post) return
    const newCount = liked ? (post.like_count || 0) - 1 : (post.like_count || 0) + 1
    await supabase.from('community_posts').update({ like_count: newCount }).eq('id', id)
    setPost((prev: any) => ({ ...prev, like_count: newCount }))
    setLiked(!liked)
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !comment.trim()) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        author_id: user.id,
        content: comment.trim(),
      })
      .select('*, author:profiles(username, full_name, avatar_url, grade)')
      .single()

    if (!error && data) {
      setComments((prev) => [...prev, data])
      setComment('')
      // comment_count 업데이트
      setPost((prev: any) => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }))
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        로딩 중...
      </div>
    )
  }

  if (!post) return null

  const hasMedia = post.media_urls && post.media_urls.length > 0

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 라이트박스 */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxMedia(null)}
          >
            <X className="w-8 h-8" />
          </button>
          {lightboxMedia.match(/\.(mp4|webm|mov)$/i) ? (
            <video
              src={lightboxMedia}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightboxMedia}
              alt=""
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      <Link href="/community" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        카페로 돌아가기
      </Link>

      {/* 게시글 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
        {/* 게시판 + 카테고리 */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            href={`/community?board=${post.board_slug || 'general'}`}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
          >
            {BOARD_NAMES[post.board_slug] || '자유게시판'}
          </Link>
          {post.tags && post.tags.length > 0 && post.tags.map((tag: string) => (
            <span key={tag} className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>

        {/* 작성자 정보 */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          {post.author && (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {post.author.full_name?.[0] || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {post.author.full_name || post.author.username || '익명'}
                  </span>
                  <GradeBadge grade={(post.author.grade || '씨앗') as Grade} size="sm" />
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  게시글 {post.author.post_count || 0}개 · 댓글 {post.author.comment_count || 0}개
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
            </span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {(post.view_count || 0) + 1}</span>
          </div>
        </div>

        {/* 본문 내용 */}
        <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mb-6">
          {post.content}
        </div>

        {/* 미디어 (이미지/동영상) */}
        {hasMedia && (
          <div className="mb-6">
            <div className={`grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : post.media_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {post.media_urls.map((url: string, index: number) => {
                const isVideo = url.match(/\.(mp4|webm|mov)$/i)
                return (
                  <div
                    key={index}
                    className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group"
                    style={{ aspectRatio: post.media_urls.length === 1 ? '16/9' : '1/1' }}
                    onClick={() => setLightboxMedia(url)}
                  >
                    {isVideo ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Play className="w-12 h-12 text-white opacity-80" />
                        <video src={url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={`미디어 ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isVideo ? (
                        <Play className="w-5 h-5 text-white drop-shadow" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-white drop-shadow" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {post.media_urls.length}개의 미디어 · 클릭하여 크게 보기
            </p>
          </div>
        )}

        {/* 좋아요 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            disabled={!user}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              liked
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-500'
            } disabled:opacity-50`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            좋아요 {post.like_count || 0}
          </button>
        </div>
      </div>

      {/* 댓글 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          댓글 {comments.length}개
        </h2>

        <div className="space-y-4 mb-6">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                {c.author?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {c.author?.full_name || c.author?.username || '익명'}
                  </span>
                  {c.author?.grade && (
                    <GradeBadge grade={c.author.grade as Grade} size="sm" />
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">첫 번째 댓글을 작성해보세요!</p>
          )}
        </div>

        {/* 댓글 작성 */}
        {user ? (
          <form onSubmit={handleComment} className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm flex-shrink-0">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                등록
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              댓글 작성은 로그인 후 이용 가능합니다.{' '}
              <Link href="/login" className="text-indigo-600 hover:underline font-medium">로그인</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
