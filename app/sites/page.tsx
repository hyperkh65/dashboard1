'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, Globe, Plus, X, Clock, XCircle } from 'lucide-react'

interface PromotedSite {
  id: string
  name: string
  url: string
  description: string | null
  logo_url: string | null
  category: string
  status: string
  submitted_by: string | null
  rejection_reason: string | null
}

const GRADE_ORDER = ['씨앗', '새싹', '잎새', '나무', '열매', 'staff']
const MIN_SUBMIT_GRADE = '새싹'

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: '승인 대기', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', icon: <Clock className="w-3 h-3" /> },
  rejected: { label: '거절됨',    color: 'text-red-600 bg-red-50 dark:bg-red-900/20',       icon: <XCircle className="w-3 h-3" /> },
}

const EMPTY_FORM = { name: '', url: '', description: '', category: '일반' }

export default function SitesPage() {
  const supabase = createClient()

  const [sites, setSites] = useState<PromotedSite[]>([])
  const [mySites, setMySites] = useState<PromotedSite[]>([])
  const [loading, setLoading] = useState(true)
  const [userGrade, setUserGrade] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const canSubmit =
    userGrade !== null &&
    GRADE_ORDER.indexOf(userGrade) >= GRADE_ORDER.indexOf(MIN_SUBMIT_GRADE)

  useEffect(() => {
    const load = async () => {
      const { data: approvedSites } = await supabase
        .from('promoted_sites')
        .select('*')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      setSites(approvedSites || [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('grade')
          .eq('id', user.id)
          .single()

        setUserGrade(profile?.grade ?? '씨앗')

        const { data: userSites } = await supabase
          .from('promoted_sites')
          .select('*')
          .eq('submitted_by', user.id)
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false })

        setMySites(userSites || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const flash = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 5000)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      flash('사이트 이름과 URL을 입력해주세요.', 'error')
      return
    }
    setSubmitting(true)
    const { data, error } = await supabase
      .from('promoted_sites')
      .insert({
        name: form.name,
        url: form.url,
        description: form.description,
        category: form.category,
        status: 'pending',
        submitted_by: userId,
        is_active: false,
        order_index: 999,
      })
      .select()
      .single()

    setSubmitting(false)
    if (error) {
      flash('제출 실패: ' + error.message, 'error')
    } else {
      setMySites((prev) => [data, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
      flash('제출되었습니다! 관리자 승인 후 게시됩니다.')
    }
  }

  const handleCancelSubmit = async (id: string) => {
    if (!confirm('이 제출을 취소하시겠습니까?')) return
    const { error } = await supabase.from('promoted_sites').delete().eq('id', id)
    if (!error) setMySites((prev) => prev.filter((s) => s.id !== id))
  }

  const grouped = sites.reduce((acc: Record<string, PromotedSite[]>, site) => {
    const cat = site.category || '일반'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(site)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        로딩 중...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">추천 사이트</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl">
            커뮤니티 멤버들이 추천하는 유용한 사이트 모음입니다.
          </p>
          {userGrade && !canSubmit && (
            <p className="text-sm text-gray-400 mt-2">
              새싹 이상 등급부터 사이트를 제안할 수 있습니다. (현재: {userGrade})
            </p>
          )}
        </div>
        {canSubmit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '취소' : '사이트 제안'}
          </button>
        )}
      </div>

      {/* 알림 */}
      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* 제출 폼 */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">사이트 제안하기</h3>
          <div className="grid sm:grid-cols-2 gap-4">
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
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="일반, AI 도구, 뉴스 등"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">간단한 설명</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="사이트에 대한 설명"
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
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? '제출 중...' : '제안 제출'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            제출 후 관리자 검토를 거쳐 게시됩니다.
          </p>
        </div>
      )}

      {/* 내 제출 현황 */}
      {mySites.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">내 제출 현황</h2>
          <div className="space-y-2">
            {mySites.map((site) => {
              const st = STATUS_LABEL[site.status]
              return (
                <div key={site.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{site.name}</span>
                    <span className="text-gray-400 text-xs ml-2 truncate">{site.url}</span>
                    {site.rejection_reason && (
                      <p className="text-xs text-red-500 mt-0.5">거절 사유: {site.rejection_reason}</p>
                    )}
                  </div>
                  {st && (
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  )}
                  {site.status === 'pending' && (
                    <button
                      onClick={() => handleCancelSubmit(site.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      취소
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 승인된 사이트 목록 */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>등록된 사이트가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                {category}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((site) => (
                  <a
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {site.logo_url ? (
                        <img
                          src={site.logo_url}
                          alt={site.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-6 h-6 text-indigo-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {site.name}
                          </h3>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{site.url}</p>
                        {site.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {site.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
