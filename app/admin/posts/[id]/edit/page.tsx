'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, Save, Shield } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [isMembersOnly, setIsMembersOnly] = useState(false)
  const [isPublished, setIsPublished] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) { setChecking(false); return }
      setIsAdmin(true)

      // 카테고리 + 게시글 동시 로드
      const [{ data: cats }, { data: post }] = await Promise.all([
        supabase.from('categories').select('id, name, slug').order('name'),
        supabase.from('posts').select('*').eq('id', postId).single(),
      ])

      setCategories(cats || [])
      if (post) {
        setTitle(post.title || '')
        setContent(post.content || '')
        setExcerpt(post.excerpt || '')
        setCategoryId(post.category_id || '')
        setTags((post.tags || []).join(', '))
        setCoverImage(post.cover_image || '')
        setSourceUrl(post.source_url || '')
        setIsMembersOnly(post.is_members_only || false)
        setIsPublished(post.is_published ?? true)
      }
      setChecking(false)
    }
    init()
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)

    const res = await fetch(`/api/admin/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        excerpt: excerpt || content.substring(0, 200),
        category_id: categoryId || null,
        tags: tagList,
        cover_image: coverImage || null,
        source_url: sourceUrl || null,
        is_members_only: isMembersOnly,
        is_published: isPublished,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '수정에 실패했습니다')
      setLoading(false)
      return
    }

    router.push(`/posts/${data.data.slug}`)
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">관리자 권한이 없습니다.</p>
        <Link href="/" className="text-indigo-600 hover:underline">홈으로</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/posts"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          인사이트
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <div className="flex items-center gap-2 text-indigo-600">
          <FileText className="w-4 h-4" />
          <span className="font-medium">글 편집</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">글 편집</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              카테고리
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">카테고리 없음</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 커버 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              커버 이미지 URL
            </label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            {coverImage && (
              <img src={coverImage} alt="커버 미리보기" className="mt-2 h-32 rounded-xl object-cover" />
            )}
          </div>

          {/* 요약 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              요약
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          {/* 본문 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              본문 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={16}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-y font-mono leading-relaxed"
            />
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              태그 <span className="text-gray-400 text-xs">(쉼표로 구분)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="AI, GPT-4, 프롬프트"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* 출처 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              출처 URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* 옵션 */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">발행 상태</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isMembersOnly}
                onChange={(e) => setIsMembersOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">멤버 전용</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? '저장 중...' : '저장하기'}
            </button>
            <Link
              href="/posts"
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
