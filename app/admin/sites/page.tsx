'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, Globe, ExternalLink } from 'lucide-react'

interface PromotedSite {
  id: string
  name: string
  url: string
  description: string
  logo_url: string
  category: string
  is_active: boolean
  order_index: number
}

const EMPTY_FORM = {
  name: '',
  url: '',
  description: '',
  logo_url: '',
  category: '일반',
  is_active: true,
  order_index: 0,
}

export default function AdminSitesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<PromotedSite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
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
        .from('promoted_sites')
        .select('*')
        .order('order_index', { ascending: true })

      setSites(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
    else { setError(msg); setTimeout(() => setError(''), 4000) }
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      flash('사이트 이름과 URL을 입력해주세요.', 'error')
      return
    }
    setError('')
    const { data, error: err } = await supabase
      .from('promoted_sites')
      .insert({ ...form, order_index: sites.length })
      .select()
      .single()

    if (err) { flash('생성 실패: ' + err.message, 'error'); return }
    setSites((prev) => [...prev, data])
    setForm(EMPTY_FORM)
    setShowForm(false)
    flash('사이트가 추가되었습니다!')
  }

  const handleUpdate = async (site: PromotedSite) => {
    setSaving(site.id)
    const { error: err } = await supabase
      .from('promoted_sites')
      .update({
        name: site.name,
        url: site.url,
        description: site.description,
        logo_url: site.logo_url,
        category: site.category,
        is_active: site.is_active,
        order_index: site.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', site.id)

    setSaving(null)
    if (err) flash('저장 실패: ' + err.message, 'error')
    else flash('저장되었습니다!')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 사이트를 삭제하시겠습니까?')) return
    const { error: err } = await supabase.from('promoted_sites').delete().eq('id', id)
    if (!err) setSites((prev) => prev.filter((s) => s.id !== id))
    else flash('삭제 실패: ' + err.message, 'error')
  }

  const updateSite = (id: string, field: keyof PromotedSite, value: string | boolean | number) => {
    setSites((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
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
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">사이트 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">메뉴에 표시될 추천 사이트를 관리합니다</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/sites"
            target="_blank"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            미리보기
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            사이트 추가
          </button>
        </div>
      </div>

      {/* 알림 */}
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

      {/* 새 사이트 폼 */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">새 사이트 추가</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">사이트 이름 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 2days"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://site.2days.kr"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="일반, 파트너, 추천 등"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">로고 URL (선택)</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">설명 (선택)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="사이트에 대한 간단한 설명"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              추가하기
            </button>
          </div>
        </div>
      )}

      {/* 사이트 목록 */}
      {sites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 사이트가 없습니다. 사이트를 추가해보세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map((site) => (
            <div key={site.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-start gap-4">
                {/* 아이콘 */}
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                  {site.logo_url ? (
                    <img src={site.logo_url} alt={site.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Globe className="w-5 h-5 text-indigo-500" />
                  )}
                </div>

                {/* 필드들 */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">사이트 이름</label>
                    <input
                      type="text"
                      value={site.name}
                      onChange={(e) => updateSite(site.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                    <input
                      type="url"
                      value={site.url}
                      onChange={(e) => updateSite(site.id, 'url', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
                    <input
                      type="text"
                      value={site.category}
                      onChange={(e) => updateSite(site.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">설명</label>
                    <input
                      type="text"
                      value={site.description || ''}
                      onChange={(e) => updateSite(site.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">순서</label>
                    <input
                      type="number"
                      value={site.order_index}
                      onChange={(e) => updateSite(site.id, 'order_index', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={site.is_active}
                      onChange={(e) => updateSite(site.id, 'is_active', e.target.checked)}
                      className="rounded"
                    />
                    활성
                  </label>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    방문
                  </a>
                  <button
                    onClick={() => handleUpdate(site)}
                    disabled={saving === site.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving === site.id ? '저장 중' : '저장'}
                  </button>
                  <button
                    onClick={() => handleDelete(site.id)}
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
      )}
    </div>
  )
}
