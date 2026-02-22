'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Connection = {
  platform: string
  platform_username: string
  platform_display_name: string
  platform_avatar: string | null
  is_active: boolean
  updated_at: string
}

type Template = {
  id: string
  title: string
  content: string
  platforms: string[]
  created_at: string
}

type Schedule = {
  id: string
  template_id: string
  template: { id: string; title: string; content: string } | null
  platforms: string[]
  repeat_type: 'hours' | 'days'
  repeat_interval: number
  start_at: string
  end_at: string | null
  next_post_at: string
  is_active: boolean
  total_posted: number
}

type Log = {
  id: string
  platform: string
  status: 'success' | 'failed'
  platform_post_id: string | null
  error_message: string | null
  posted_at: string
  template: { title: string } | null
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    key: 'twitter',
    name: 'X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    bg: 'bg-black',
    textColor: 'text-white',
    charLimit: 280,
  },
  {
    key: 'threads',
    name: 'Threads',
    icon: (
      <svg viewBox="0 0 192 192" className="w-5 h-5 fill-current" aria-hidden>
        <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
      </svg>
    ),
    bg: 'bg-black',
    textColor: 'text-white',
    charLimit: 500,
  },
  {
    key: 'facebook',
    name: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    bg: 'bg-[#1877F2]',
    textColor: 'text-white',
    charLimit: 63206,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    bg: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
    textColor: 'text-white',
    charLimit: 2200,
  },
]

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

type Tab = 'connections' | 'templates' | 'schedules' | 'logs'

export default function SnsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('connections')
  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
      }
      setLoading(false)
    })
  }, [])

  // URL 파라미터 처리
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      alert(`✅ ${connected} 연결 완료!`)
      window.location.href = '/sns'
    }
    if (error) {
      alert(`❌ 오류: ${decodeURIComponent(error)}`)
      window.location.href = '/sns'
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'connections', label: 'SNS 연결' },
    { key: 'templates', label: '게시물 템플릿' },
    { key: 'schedules', label: '스케줄' },
    { key: 'logs', label: '포스팅 로그' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">SNS 자동 포스팅</h1>
      <p className="text-gray-500 text-sm mb-6">
        SNS 계정을 연결하고 게시물을 예약·반복 포스팅할 수 있습니다.
      </p>

      {/* 탭 */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'connections' && <ConnectionsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'schedules' && <SchedulesTab />}
      {activeTab === 'logs' && <LogsTab />}
    </div>
  )
}

// ─── SNS 연결 탭 ──────────────────────────────────────────────────────────────

function ConnectionsTab() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConnections = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/sns/connections')
    const data = await res.json()
    console.log('[SNS Frontend] API 응답:', { status: res.status, data })
    if (res.ok) {
      setConnections(data)
      console.log('[SNS Frontend] Connections 설정됨:', data)
    } else {
      console.error('[SNS Frontend] API 에러:', data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  const disconnect = async (platform: string) => {
    if (!confirm(`${platform} 연결을 해제할까요?`)) return
    await fetch('/api/sns/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
    fetchConnections()
  }

  const connectedMap = Object.fromEntries(connections.map((c) => [c.platform, c]))

  console.log('[SNS Frontend] ConnectedMap:', connectedMap)
  console.log('[SNS Frontend] PLATFORMS:', PLATFORMS.map(p => p.key))

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PLATFORMS.map((p) => {
        const conn = connectedMap[p.key]
        console.log(`[SNS Frontend] Platform ${p.key}:`, { found: !!conn, conn })
        return (
          <div key={p.key} className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${p.bg} ${p.textColor} flex items-center justify-center shrink-0`}>
                {p.icon}
              </div>
              <div>
                <div className="font-semibold text-sm">{p.name}</div>
                {conn ? (
                  <div className="text-xs text-green-600 font-medium">연결됨</div>
                ) : (
                  <div className="text-xs text-gray-400">미연결</div>
                )}
              </div>
            </div>

            {conn ? (
              <>
                <div className="flex items-center gap-2">
                  {conn.platform_avatar && (
                    <img src={conn.platform_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{conn.platform_display_name}</div>
                    <div className="text-xs text-gray-400">{conn.platform_username}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  연결: {formatDate(conn.updated_at)}
                </div>
                <button
                  onClick={() => disconnect(p.key)}
                  className="mt-auto text-sm text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                >
                  연결 해제
                </button>
              </>
            ) : (
              <a
                href={`/api/sns/connect/${p.key}`}
                className={`mt-auto text-sm font-medium ${p.bg} ${p.textColor} rounded-lg px-3 py-2 text-center hover:opacity-90 transition-opacity`}
              >
                {p.name} 연결하기
              </a>
            )}
          </div>
        )
      })}
      {loading && <div className="col-span-3 text-center text-gray-400 py-8">불러오는 중...</div>}
    </div>
  )
}

// ─── 게시물 템플릿 탭 ────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Template | null>(null)
  const [posting, setPosting] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/sns/templates')
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const deleteTemplate = async (id: string) => {
    if (!confirm('삭제할까요?')) return
    await fetch(`/api/sns/templates/${id}`, { method: 'DELETE' })
    fetchTemplates()
  }

  const postNow = async (template: Template) => {
    const platforms = template.platforms.length > 0 ? template.platforms : ['twitter']
    setPosting(template.id)
    const res = await fetch('/api/sns/post-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: template.id, platforms }),
    })
    const data = await res.json()
    setPosting(null)
    const success = data.results?.filter((r: { success: boolean }) => r.success).length || 0
    alert(`✅ ${success}개 플랫폼에 게시 완료!\n${JSON.stringify(data.results, null, 2)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">게시물 템플릿 ({templates.length}개)</h2>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 새 템플릿
        </button>
      </div>

      {showForm && (
        <TemplateForm
          initial={editTarget}
          onSave={() => { setShowForm(false); fetchTemplates() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">불러오는 중...</div>
      ) : templates.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">저장된 템플릿이 없습니다.</p>
          <p className="text-xs mt-1">위 버튼으로 새 템플릿을 만들어보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {t.platforms.map((p) => {
                      const pl = PLATFORMS.find((x) => x.key === p)
                      return pl ? (
                        <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${pl.bg} ${pl.textColor}`}>
                          {pl.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setEditTarget(t); setShowForm(true) }}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded-lg"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 border border-red-100 rounded-lg"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {t.content}
              </pre>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{formatDate(t.created_at)}</span>
                <button
                  onClick={() => postNow(t)}
                  disabled={posting === t.id}
                  className="text-sm font-medium bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {posting === t.id ? '게시 중...' : '지금 게시'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Template | null
  onSave: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [platforms, setPlatforms] = useState<string[]>(initial?.platforms ?? [])
  const [saving, setSaving] = useState(false)

  const togglePlatform = (key: string) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }
    setSaving(true)
    const url = initial ? `/api/sns/templates/${initial.id}` : '/api/sns/templates'
    const method = initial ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, platforms }),
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <h3 className="font-medium text-sm">{initial ? '템플릿 수정' : '새 템플릿'}</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="내부용 제목 (예: AI 뉴스 홍보)"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="게시물 내용을 입력하세요..."
        rows={5}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none"
      />
      <div>
        <div className="text-xs text-gray-500 mb-2">게시할 플랫폼</div>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => togglePlatform(p.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                platforms.includes(p.key)
                  ? `${p.bg} ${p.textColor} border-transparent`
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {p.icon}
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">취소</button>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

// ─── 스케줄 탭 ───────────────────────────────────────────────────────────────

function SchedulesTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [sRes, tRes] = await Promise.all([
      fetch('/api/sns/schedules'),
      fetch('/api/sns/templates'),
    ])
    if (sRes.ok) setSchedules(await sRes.json())
    if (tRes.ok) setTemplates(await tRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggle = async (schedule: Schedule) => {
    await fetch(`/api/sns/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !schedule.is_active }),
    })
    fetchAll()
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm('스케줄을 삭제할까요?')) return
    await fetch(`/api/sns/schedules/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">반복 스케줄 ({schedules.length}개)</h2>
        {templates.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 스케줄 추가
          </button>
        )}
      </div>

      {showForm && (
        <ScheduleForm
          templates={templates}
          onSave={() => { setShowForm(false); fetchAll() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {templates.length === 0 && !loading && (
        <div className="text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          먼저 게시물 템플릿을 만들어주세요.
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">불러오는 중...</div>
      ) : schedules.length === 0 && templates.length > 0 ? (
        <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">등록된 스케줄이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className={`border rounded-xl p-4 ${s.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-medium text-sm">{s.template?.title ?? '(삭제된 템플릿)'}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.platforms.map((p) => {
                      const pl = PLATFORMS.find((x) => x.key === p)
                      return pl ? (
                        <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${pl.bg} ${pl.textColor}`}>
                          {pl.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  <button
                    onClick={() => toggle(s)}
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      s.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {s.is_active ? '실행 중' : '일시정지'}
                  </button>
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
                <div>
                  반복: 매 {s.repeat_interval}{s.repeat_type === 'hours' ? '시간' : '일'}마다
                </div>
                <div>총 {s.total_posted}회 게시됨</div>
                <div>다음 게시: {formatDate(s.next_post_at)}</div>
                {s.end_at && <div>종료: {formatDate(s.end_at)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScheduleForm({
  templates,
  onSave,
  onCancel,
}: {
  templates: Template[]
  onSave: () => void
  onCancel: () => void
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [repeatType, setRepeatType] = useState<'hours' | 'days'>('hours')
  const [repeatInterval, setRepeatInterval] = useState(6)
  const [startAt, setStartAt] = useState(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [endAt, setEndAt] = useState('')
  const [saving, setSaving] = useState(false)

  const togglePlatform = (key: string) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const save = async () => {
    if (!templateId || platforms.length === 0) {
      alert('템플릿과 플랫폼을 선택해주세요.')
      return
    }
    setSaving(true)
    await fetch('/api/sns/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        platforms,
        repeat_type: repeatType,
        repeat_interval: repeatInterval,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
      }),
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <h3 className="font-medium text-sm">반복 스케줄 추가</h3>

      <div>
        <label className="text-xs text-gray-500 block mb-1">게시물 템플릿</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">게시할 플랫폼</label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => togglePlatform(p.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                platforms.includes(p.key)
                  ? `${p.bg} ${p.textColor} border-transparent`
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {p.icon}
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">반복 단위</label>
          <select
            value={repeatType}
            onChange={(e) => setRepeatType(e.target.value as 'hours' | 'days')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="hours">시간</option>
            <option value="days">일</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">
            {repeatType === 'hours' ? '몇 시간마다?' : '몇 일마다?'}
          </label>
          <input
            type="number"
            min={1}
            value={repeatInterval}
            onChange={(e) => setRepeatInterval(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">시작 시간</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">종료 시간 (선택)</label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      {repeatInterval > 0 && (
        <div className="text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
          매 {repeatInterval}{repeatType === 'hours' ? '시간' : '일'}마다 자동 게시됩니다.
          {endAt ? ` ${new Date(endAt).toLocaleDateString('ko-KR')} 종료.` : ' 수동으로 중지할 때까지 계속.'}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">취소</button>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '스케줄 추가'}
        </button>
      </div>
    </div>
  )
}

// ─── 포스팅 로그 탭 ──────────────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sns/logs').then((r) => r.ok ? r.json() : []).then((data) => {
      setLogs(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-2">
      <h2 className="font-semibold mb-4">포스팅 로그 (최근 50건)</h2>
      {loading ? (
        <div className="text-center text-gray-400 py-8">불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl text-sm">
          아직 포스팅 기록이 없습니다.
        </div>
      ) : (
        logs.map((log) => {
          const pl = PLATFORMS.find((p) => p.key === log.platform)
          return (
            <div key={log.id} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
              log.status === 'success' ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'
            }`}>
              <div className={`w-8 h-8 rounded-full ${pl?.bg ?? 'bg-gray-400'} ${pl?.textColor ?? 'text-white'} flex items-center justify-center text-xs shrink-0`}>
                {pl?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{log.template?.title ?? '(삭제됨)'}</div>
                <div className="text-xs text-gray-500">{pl?.name} · {formatDate(log.posted_at)}</div>
                {log.error_message && (
                  <div className="text-xs text-red-600 mt-0.5 truncate">{log.error_message}</div>
                )}
              </div>
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {log.status === 'success' ? '성공' : '실패'}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
