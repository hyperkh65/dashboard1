'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Video,
  X,
  Loader2,
  Send,
  Shield,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface UploadedMedia {
  url: string
  type: 'image' | 'video'
  name: string
}

export default function NewPostPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

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

  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 관리자 확인 + 카테고리 로드
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

      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name')
      setCategories(cats || [])
      setChecking(false)
    }
    init()
  }, [])

  // 커버 이미지 업로드
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '업로드 실패'); return }
      setCoverImage(data.url)
    } catch {
      setError('커버 이미지 업로드 중 오류가 발생했습니다')
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  // 본문 미디어 업로드 (복수)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError('')

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) { setError(data.error || '업로드 실패'); break }
        const isVideo = file.type.startsWith('video/')
        setMediaFiles((prev) => [
          ...prev,
          { url: data.url, type: isVideo ? 'video' : 'image', name: file.name },
        ])
      } catch {
        setError('미디어 업로드 중 오류가 발생했습니다')
        break
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    const mediaUrls = mediaFiles.map((m) => m.url)

    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        excerpt: excerpt || undefined,
        category_id: categoryId || undefined,
        tags: tagList,
        cover_image: coverImage || undefined,
        media_urls: mediaUrls,
        source_url: sourceUrl || undefined,
        is_members_only: isMembersOnly,
        is_published: isPublished,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '게시글 등록에 실패했습니다')
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
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          관리자
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <div className="flex items-center gap-2 text-indigo-600">
          <FileText className="w-4 h-4" />
          <span className="font-medium">AI 인사이트 새 글</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">새 글 작성</h1>

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
              placeholder="글 제목을 입력하세요"
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
              <option value="">카테고리 선택</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 커버 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              커버 이미지
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleCoverUpload}
              className="hidden"
            />
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 mb-2">
                <img src={coverImage} alt="커버 이미지" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="flex items-center gap-2 px-4 py-3 w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50 justify-center text-sm"
              >
                {coverUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                {coverUploading ? '업로드 중...' : '커버 이미지 업로드 (클릭)'}
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1.5">또는 이미지 URL 직접 입력</p>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* 요약 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              요약 <span className="text-gray-400 text-xs">(비워두면 본문 앞 200자 자동 사용)</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              placeholder="글 목록에 표시될 짧은 요약"
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
              placeholder="글 내용을 입력하세요"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-y font-mono leading-relaxed"
            />
          </div>

          {/* 사진 / 동영상 첨부 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              사진 / 동영상 첨부
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/jpeg,image/png,image/gif,image/webp'
                    fileInputRef.current.click()
                  }
                }}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50 text-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {uploading ? '업로드 중...' : '이미지 추가'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/mp4,video/webm,video/quicktime'
                    fileInputRef.current.click()
                  }
                }}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50 text-sm"
              >
                <Video className="w-4 h-4" />
                동영상 추가
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, GIF, WEBP, MP4, WEBM 지원 / 파일당 최대 50MB</p>

            {/* 미디어 미리보기 */}
            {mediaFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mediaFiles.map((media, index) => (
                  <div
                    key={index}
                    className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video"
                  >
                    {media.type === 'image' ? (
                      <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                    ) : (
                      <video src={media.url} className="w-full h-full object-cover" controls={false} />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {media.type === 'video' ? '동영상' : '이미지'}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              출처 URL <span className="text-gray-400 text-xs">(선택)</span>
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
              <span className="text-sm text-gray-700 dark:text-gray-300">즉시 발행</span>
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

          {/* 버튼 */}
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              disabled={loading || uploading || coverUploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? '발행 중...' : '발행하기'}
            </button>
            <Link
              href="/admin"
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
