'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Shield, Eye, Pencil } from 'lucide-react'
import { Board, BoardPermission } from '@/types'

const PERMISSION_OPTIONS: { value: BoardPermission; label: string }[] = [
  { value: 'all', label: '전체 (비회원 포함)' },
  { value: 'member', label: '회원 (로그인 필요)' },
  { value: '씨앗', label: '씨앗 이상' },
  { value: '새싹', label: '새싹 이상' },
  { value: '잎새', label: '잎새 이상' },
  { value: '나무', label: '나무 이상' },
  { value: '열매', label: '열매 이상' },
  { value: 'staff', label: '스탭 전용' },
]

const ICON_OPTIONS = ['MessageSquare', 'Bell', 'HelpCircle', 'Sparkles', 'BookOpen', 'Crown', 'Star', 'Heart', 'Users', 'Zap']

export default function AdminBoardsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [newBoard, setNewBoard] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#6366f1',
    icon: 'MessageSquare',
    read_permission: 'all' as BoardPermission,
    write_permission: 'member' as BoardPermission,
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) { router.push('/'); return }

      const { data } = await supabase
        .from('boards')
        .select('*')
        .order('order_index', { ascending: true })

      setBoards(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleUpdate = async (board: Board) => {
    setSaving(board.id)
    setError('')
    const { error } = await supabase
      .from('boards')
      .update({
        name: board.name,
        description: board.description,
        color: board.color,
        icon: board.icon,
        read_permission: board.read_permission,
        write_permission: board.write_permission,
        is_active: board.is_active,
        order_index: board.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', board.id)

    if (error) setError('저장 실패: ' + error.message)
    else setSuccess('저장되었습니다!')
    setSaving(null)
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 게시판을 삭제하시겠습니까? 게시판 내 게시글은 삭제되지 않습니다.')) return
    const { error } = await supabase.from('boards').delete().eq('id', id)
    if (!error) setBoards((prev) => prev.filter((b) => b.id !== id))
  }

  const handleCreate = async () => {
    if (!newBoard.name || !newBoard.slug) {
      setError('이름과 슬러그를 입력해주세요')
      return
    }
    setError('')
    const { data, error } = await supabase
      .from('boards')
      .insert({
        ...newBoard,
        order_index: boards.length,
      })
      .select()
      .single()

    if (error) {
      setError('게시판 생성 실패: ' + error.message)
    } else {
      setBoards((prev) => [...prev, data])
      setNewBoard({ name: '', slug: '', description: '', color: '#6366f1', icon: 'MessageSquare', read_permission: 'all', write_permission: 'member' })
      setShowNewForm(false)
      setSuccess('게시판이 생성되었습니다!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const updateBoard = (id: string, field: keyof Board, value: string | boolean | number) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        로딩 중...
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">게시판 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">읽기/쓰기 권한 및 게시판 설정을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 게시판 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* 권한 설명 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">권한 설정 안내</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              읽기 권한: 게시글 목록 및 내용을 볼 수 있는 최소 등급<br />
              쓰기 권한: 게시글을 작성할 수 있는 최소 등급<br />
              최소 포인트: 읽기에 필요한 추가 포인트 조건 (0=제한없음)<br />
              등급 순서: 씨앗 → 새싹 → 잎새 → 나무 → 열매 → 스탭
            </p>
          </div>
        </div>
      </div>

      {/* 새 게시판 폼 */}
      {showNewForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">새 게시판 생성</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">게시판 이름 *</label>
              <input
                type="text"
                value={newBoard.name}
                onChange={(e) => setNewBoard((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="자유게시판"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">슬러그 (영문) *</label>
              <input
                type="text"
                value={newBoard.slug}
                onChange={(e) => setNewBoard((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="general"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">설명</label>
              <input
                type="text"
                value={newBoard.description}
                onChange={(e) => setNewBoard((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="게시판 설명"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> 읽기 권한</label>
              <select
                value={newBoard.read_permission}
                onChange={(e) => setNewBoard((prev) => ({ ...prev, read_permission: e.target.value as BoardPermission }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Pencil className="w-3 h-3" /> 쓰기 권한</label>
              <select
                value={newBoard.write_permission}
                onChange={(e) => setNewBoard((prev) => ({ ...prev, write_permission: e.target.value as BoardPermission }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowNewForm(false)}
              className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              게시판 생성
            </button>
          </div>
        </div>
      )}

      {/* 게시판 목록 */}
      <div className="space-y-4">
        {boards.map((board) => (
          <div key={board.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: board.color }}
              >
                <span className="text-lg">📋</span>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">게시판 이름</label>
                    <input
                      type="text"
                      value={board.name}
                      onChange={(e) => updateBoard(board.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">슬러그</label>
                    <input
                      type="text"
                      value={board.slug}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> 읽기 권한
                  </label>
                  <select
                    value={board.read_permission}
                    onChange={(e) => updateBoard(board.id, 'read_permission', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PERMISSION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> 쓰기 권한
                  </label>
                  <select
                    value={board.write_permission}
                    onChange={(e) => updateBoard(board.id, 'write_permission', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PERMISSION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={board.is_active}
                    onChange={(e) => updateBoard(board.id, 'is_active', e.target.checked)}
                    className="rounded"
                  />
                  활성
                </label>
                <button
                  onClick={() => handleUpdate(board)}
                  disabled={saving === board.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving === board.id ? '저장 중' : '저장'}
                </button>
                <button
                  onClick={() => handleDelete(board.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 text-red-600 text-xs font-medium rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
