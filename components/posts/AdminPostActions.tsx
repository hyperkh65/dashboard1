'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, FolderInput, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Props {
  postId: string
  postSlug: string
  currentCategoryId?: string | null
  /** 카드 위에 올리는 오버레이 모드 vs 상세 페이지 인라인 모드 */
  mode?: 'overlay' | 'inline'
}

export default function AdminPostActions({ postId, postSlug, currentCategoryId, mode = 'inline' }: Props) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(({ data }) => {
        if (data?.is_admin) setIsAdmin(true)
      })
    })
  }, [])

  if (!isAdmin) return null

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    setConfirmDelete(false)
    const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/posts')
      router.refresh()
    } else {
      alert('삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  const handleMove = async (categoryId: string) => {
    setMoving(true)
    const res = await fetch(`/api/admin/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId || null }),
    })
    if (res.ok) {
      setShowMove(false)
      router.refresh()
    } else {
      alert('카테고리 이동에 실패했습니다.')
    }
    setMoving(false)
  }

  const loadCategories = async () => {
    if (categories.length > 0) { setShowMove(true); return }
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('id, name').order('name')
    setCategories(data || [])
    setShowMove(true)
  }

  if (mode === 'overlay') {
    return (
      <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
        {confirmDelete ? (
          <>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}
              className="h-7 px-2 bg-gray-100 dark:bg-gray-700 shadow rounded-lg text-xs text-gray-600 dark:text-gray-300"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-7 px-2 bg-red-500 shadow rounded-lg text-xs text-white font-medium disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '삭제'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/admin/posts/${postId}/edit`) }}
              className="w-7 h-7 bg-white dark:bg-gray-800 shadow rounded-lg flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
              title="편집"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await loadCategories() }}
              className="w-7 h-7 bg-white dark:bg-gray-800 shadow rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
              title="카테고리 이동"
            >
              {moving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderInput className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-7 h-7 bg-white dark:bg-gray-800 shadow rounded-lg flex items-center justify-center text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
              title="삭제"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </>
        )}

        {/* 카테고리 이동 드롭다운 */}
        {showMove && (
          <div className="absolute top-9 right-0 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
            <p className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">카테고리 이동</p>
            <button
              onClick={() => handleMove('')}
              className={`w-full text-left text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!currentCategoryId ? 'text-indigo-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            >
              카테고리 없음
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleMove(cat.id)}
                className={`w-full text-left text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentCategoryId === cat.id ? 'text-indigo-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setShowMove(false)}
              className="w-full text-left text-xs px-3 py-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    )
  }

  // inline 모드 (상세 페이지용)
  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => router.push(`/admin/posts/${postId}/edit`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
      >
        <Pencil className="w-3.5 h-3.5" />
        편집
      </button>

      <button
        onClick={loadCategories}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors font-medium"
      >
        {moving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderInput className="w-3.5 h-3.5" />}
        이동
      </button>

      {confirmDelete ? (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            정말 삭제
          </button>
        </>
      ) : (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          삭제
        </button>
      )}

      {/* 카테고리 이동 드롭다운 */}
      {showMove && (
        <div className="absolute top-10 left-16 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
          <p className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">카테고리 이동</p>
          <button
            onClick={() => handleMove('')}
            className={`w-full text-left text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!currentCategoryId ? 'text-indigo-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
          >
            카테고리 없음
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleMove(cat.id)}
              className={`w-full text-left text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentCategoryId === cat.id ? 'text-indigo-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => setShowMove(false)}
            className="w-full text-left text-xs px-3 py-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  )
}
