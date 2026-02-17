'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Send, ImagePlus, X, Video, Loader2 } from 'lucide-react'

const BOARDS = [
  { slug: 'general', name: '자유게시판' },
  { slug: 'question', name: '질문답변' },
  { slug: 'showcase', name: 'AI 인사이트 공유' },
  { slug: 'notice', name: '공지사항' },
  { slug: 'study', name: '스터디 모집' },
]

interface UploadedMedia {
  url: string
  type: 'image' | 'video'
  name: string
}

export default function NewCommunityPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [boardSlug, setBoardSlug] = useState('general')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError('')

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '업로드 실패')
          break
        }

        const isVideo = file.type.startsWith('video/')
        setMediaFiles((prev) => [
          ...prev,
          { url: data.url, type: isVideo ? 'video' : 'image', name: file.name },
        ])
      } catch {
        setError('파일 업로드 중 오류가 발생했습니다')
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        title,
        content,
        category: 'general',
        board_slug: boardSlug,
        author_id: user.id,
        is_published: true,
        media_urls: mediaFiles.map((m) => m.url),
        tags: tagList,
      })
      .select()
      .single()

    if (error) {
      setError('게시글 등록에 실패했습니다: ' + error.message)
    } else {
      router.push(`/community/${data.id}`)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/community" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        카페로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">새 글 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 게시판 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">게시판</label>
          <select
            value={boardSlug}
            onChange={(e) => setBoardSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BOARDS.map((board) => (
              <option key={board.slug} value={board.slug}>{board.name}</option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={12}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="내용을 입력하세요..."
          />
        </div>

        {/* 사진/동영상 업로드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            사진 / 동영상 첨부
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {uploading ? '업로드 중...' : '이미지 추가'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              동영상 추가
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            JPG, PNG, GIF, WEBP, MP4, WEBM 지원 / 파일당 최대 50MB
          </p>

          {/* 미디어 미리보기 */}
          {mediaFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
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
            태그 <span className="text-gray-400 font-normal">(쉼표로 구분)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="ChatGPT, 프롬프트, AI 활용"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/community"
            className="flex-1 text-center py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
            {loading ? '등록 중...' : '게시글 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
