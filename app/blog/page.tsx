'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Account = {
  id: string
  naver_id: string
  blog_id: string | null
  blog_name: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

type Post = {
  id: string
  title: string
  content: string
  category_no: number
  tags: string[]
  media_urls: string[]
  status: 'draft' | 'queued' | 'publishing' | 'published' | 'failed'
  scheduled_at: string | null
  published_at: string | null
  platform_post_id: string | null
  error_message: string | null
  retry_count: number
  created_at: string
  account: { id: string; naver_id: string; blog_id: string | null; blog_name: string | null } | null
}

type Tab = 'posts' | 'write' | 'accounts' | 'runner'

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_MAP = {
  draft: { label: '초안', color: 'bg-gray-100 text-gray-600' },
  queued: { label: '발행 대기', color: 'bg-blue-100 text-blue-700' },
  publishing: { label: '발행 중', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: '발행 완료', color: 'bg-green-100 text-green-700' },
  failed: { label: '실패', color: 'bg-red-100 text-red-600' },
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }
  if (!user) return null

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'posts', label: '포스트 목록', emoji: '📋' },
    { key: 'write', label: '글 작성', emoji: '✏️' },
    { key: 'accounts', label: '계정 설정', emoji: '🔑' },
    { key: 'runner', label: '러너 설정', emoji: '⚙️' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#03C75A] flex items-center justify-center text-white font-bold text-xl">
          N
        </div>
        <div>
          <h1 className="text-2xl font-bold">네이버 블로그 자동화</h1>
          <p className="text-gray-500 text-sm">Playwright 기반 블로그 자동 발행 시스템</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-8 border-b border-gray-200 mt-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === t.key
                ? 'border-[#03C75A] text-[#03C75A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'posts' && <PostsTab />}
      {activeTab === 'write' && <WriteTab onSaved={() => setActiveTab('posts')} />}
      {activeTab === 'accounts' && <AccountsTab />}
      {activeTab === 'runner' && <RunnerTab />}
    </div>
  )
}

// ─── 포스트 목록 탭 ───────────────────────────────────────────────────────────

function PostsTab() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editPost, setEditPost] = useState<Post | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/blog/posts?status=${filter}`)
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const changeStatus = async (postId: string, status: string) => {
    await fetch(`/api/blog/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchPosts()
  }

  const deletePost = async (postId: string) => {
    if (!confirm('포스트를 삭제할까요?')) return
    await fetch(`/api/blog/posts/${postId}`, { method: 'DELETE' })
    fetchPosts()
  }

  const filters = [
    { key: 'all', label: '전체' },
    { key: 'draft', label: '초안' },
    { key: 'queued', label: '대기' },
    { key: 'published', label: '완료' },
    { key: 'failed', label: '실패' },
  ]

  if (editPost) {
    return <WriteTab initial={editPost} onSaved={() => { setEditPost(null); fetchPosts() }} onCancel={() => setEditPost(null)} />
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-[#03C75A] text-white border-transparent'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <span className="text-xs text-gray-400">{posts.length}개</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">포스트가 없습니다.</p>
          <p className="text-xs mt-1 text-gray-300">글 작성 탭에서 새 포스트를 만들어보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const statusInfo = STATUS_MAP[post.status]
            return (
              <div key={post.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {post.account && (
                        <span className="text-xs text-gray-400">
                          {post.account.blog_name || post.account.naver_id}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm truncate">{post.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {post.content.replace(/<[^>]+>/g, ' ').substring(0, 80)}...
                    </div>
                    {post.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {post.tags.slice(0, 4).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-300 mt-1">{formatDate(post.created_at)}</div>
                    {post.status === 'failed' && post.error_message && (
                      <div className="text-xs text-red-500 mt-1 bg-red-50 rounded px-2 py-1">
                        ❌ {post.error_message}
                      </div>
                    )}
                    {post.status === 'published' && post.platform_post_id && (
                      <a
                        href={`https://blog.naver.com/${post.account?.blog_id || ''}/${post.platform_post_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                      >
                        → 블로그에서 보기
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {post.status === 'draft' && (
                      <button
                        onClick={() => changeStatus(post.id, 'queued')}
                        className="text-xs bg-[#03C75A] text-white px-3 py-1 rounded-lg hover:opacity-90"
                      >
                        발행 대기
                      </button>
                    )}
                    {(post.status === 'failed') && (
                      <button
                        onClick={() => changeStatus(post.id, 'queued')}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:opacity-90"
                      >
                        재시도
                      </button>
                    )}
                    {post.status === 'queued' && (
                      <button
                        onClick={() => changeStatus(post.id, 'draft')}
                        className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-50"
                      >
                        취소
                      </button>
                    )}
                    <button
                      onClick={() => setEditPost(post)}
                      className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-50"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-3 py-1"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 글 작성 탭 ───────────────────────────────────────────────────────────────

function WriteTab({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Post | null
  onSaved: () => void
  onCancel?: () => void
}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState(initial?.account?.id || '')
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '')
  const [categoryNo, setCategoryNo] = useState(initial?.category_no || 0)
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduled_at ? new Date(initial.scheduled_at).toISOString().slice(0, 16) : ''
  )
  const [saveAsDraft, setSaveAsDraft] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/blog/accounts').then(r => r.ok ? r.json() : []).then(setAccounts)
  }, [])

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }
    setSaving(true)
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    const body = {
      account_id: accountId || null,
      title: title.trim(),
      content: content.trim(),
      tags: tagList,
      category_no: categoryNo,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: saveAsDraft ? 'draft' : 'queued',
    }

    let res
    if (initial) {
      res = await fetch(`/api/blog/posts/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      res = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    setSaving(false)
    if (res.ok) {
      onSaved()
    } else {
      const data = await res.json()
      alert(`저장 실패: ${data.error}`)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{initial ? '포스트 수정' : '새 포스트 작성'}</h2>
        {onCancel && (
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">
            ← 목록으로
          </button>
        )}
      </div>

      {/* 계정 선택 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">네이버 계정</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">계정 선택...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.naver_id} ({a.blog_name || a.blog_id || '블로그 없음'})
            </option>
          ))}
        </select>
        {accounts.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">⚠️ 계정 설정 탭에서 네이버 계정을 먼저 추가해주세요.</p>
        )}
      </div>

      {/* 제목 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">포스트 제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="블로그 포스트 제목"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* 본문 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          본문 내용
          <span className="text-gray-300 ml-2">({content.length.toLocaleString()}자)</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="블로그 본문 내용을 입력하세요. HTML 태그 사용 가능합니다.&#10;&#10;예: <h2>소제목</h2>&#10;<p>단락 내용...</p>"
          rows={14}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-y"
        />
        <p className="text-xs text-gray-400 mt-1">💡 HTML 마크업 사용 가능. &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;img&gt; 등</p>
      </div>

      {/* 태그 & 카테고리 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">태그 (쉼표로 구분)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="AI, 챗GPT, 자동화"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">카테고리 번호 (0=기본)</label>
          <input
            type="number"
            value={categoryNo}
            onChange={(e) => setCategoryNo(Number(e.target.value))}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* 예약 발행 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">예약 발행 시간 (비워두면 즉시)</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* 저장 옵션 & 버튼 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsDraft}
            onChange={(e) => setSaveAsDraft(e.target.checked)}
            className="rounded"
          />
          초안으로 저장 (나중에 발행 대기로 변경)
        </label>
        <div className="flex gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">취소</button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="text-sm bg-[#03C75A] text-white px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {saving ? '저장 중...' : saveAsDraft ? '초안 저장' : '발행 대기 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 계정 설정 탭 ─────────────────────────────────────────────────────────────

function AccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [naverId, setNaverId] = useState('')
  const [naverPw, setNaverPw] = useState('')
  const [blogId, setBlogId] = useState('')
  const [blogName, setBlogName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/blog/accounts')
    if (res.ok) setAccounts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const saveAccount = async () => {
    if (!naverId.trim() || !naverPw.trim()) {
      alert('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/blog/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        naver_id: naverId.trim(),
        naver_pw: naverPw,
        blog_id: blogId.trim() || naverId.trim(),
        blog_name: blogName.trim(),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setNaverId('')
      setNaverPw('')
      setBlogId('')
      setBlogName('')
      fetchAccounts()
    } else {
      const data = await res.json()
      alert(`저장 실패: ${data.error}`)
    }
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('계정을 삭제할까요? 연결된 포스트는 유지됩니다.')) return
    await fetch(`/api/blog/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">네이버 계정 관리</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-[#03C75A] text-white px-4 py-2 rounded-lg hover:opacity-90"
        >
          + 계정 추가
        </button>
      </div>

      {/* 보안 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <div className="font-medium mb-1">⚠️ 보안 안내</div>
        <ul className="text-xs space-y-1 text-amber-700">
          <li>• 비밀번호는 AES-256-GCM으로 암호화되어 저장됩니다.</li>
          <li>• Playwright 러너(로컬/VPS)가 실행 시 복호화 후 사용합니다.</li>
          <li>• 네이버 계정 보안을 위해 <strong>전용 계정</strong> 사용을 권장합니다.</li>
          <li>• 네이버가 비정상 접근 감지 시 계정이 잠길 수 있습니다.</li>
        </ul>
      </div>

      {/* 계정 추가 폼 */}
      {showForm && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm">네이버 계정 추가</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">네이버 아이디 *</label>
              <input
                value={naverId}
                onChange={(e) => setNaverId(e.target.value)}
                placeholder="naver_id"
                autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">비밀번호 *</label>
              <input
                type="password"
                value={naverPw}
                onChange={(e) => setNaverPw(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">블로그 ID (URL ID)</label>
              <input
                value={blogId}
                onChange={(e) => setBlogId(e.target.value)}
                placeholder="blog.naver.com/[이부분]"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">블로그 이름</label>
              <input
                value={blogName}
                onChange={(e) => setBlogName(e.target.value)}
                placeholder="내 블로그"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2">취소</button>
            <button
              onClick={saveAccount}
              disabled={saving}
              className="text-sm bg-[#03C75A] text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 계정 목록 */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">불러오는 중...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl text-sm">
          등록된 계정이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#03C75A] flex items-center justify-center text-white text-sm font-bold">
                    N
                  </div>
                  <div>
                    <div className="font-medium text-sm">{acc.naver_id}</div>
                    <div className="text-xs text-gray-400">
                      blog.naver.com/{acc.blog_id} · {acc.blog_name}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-300 mt-1 ml-10">
                  추가: {formatDate(acc.created_at)}
                  {acc.last_login_at && ` · 마지막 로그인: ${formatDate(acc.last_login_at)}`}
                </div>
              </div>
              <button
                onClick={() => deleteAccount(acc.id)}
                className="text-sm text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-3 py-1"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 러너 설정 탭 ─────────────────────────────────────────────────────────────

function RunnerTab() {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-site.vercel.app'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold mb-1">Playwright 러너 설정</h2>
        <p className="text-sm text-gray-500">
          네이버는 공개 API를 제공하지 않아 실제 브라우저 자동화가 필요합니다.
          Playwright 러너를 로컬 PC 또는 VPS에서 실행해주세요.
        </p>
      </div>

      {/* 아키텍처 설명 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="text-sm font-medium mb-2">🏗️ 동작 구조</div>
        <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">대시보드 (Vercel)</span>
          <span>→ 포스트 큐잉 →</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">러너 (로컬/VPS)</span>
          <span>→ Playwright로 네이버 자동화 →</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">결과 보고</span>
        </div>
      </div>

      {/* 설치 가이드 */}
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 text-gray-100 px-4 py-2 text-xs font-medium">
            1️⃣ 환경 준비
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 text-xs overflow-x-auto">{`# Node.js 18+ 필요
# 패키지 설치
npm install playwright ts-node typescript

# Playwright Chromium 브라우저 설치
npx playwright install chromium`}</pre>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 text-gray-100 px-4 py-2 text-xs font-medium">
            2️⃣ 환경변수 설정
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 text-xs overflow-x-auto">{`# .env 파일 생성 또는 직접 설정
DASHBOARD_URL=${siteUrl}
BLOG_RUNNER_SECRET=your-secret-key-here   # Vercel 환경변수와 동일하게
HEADLESS=true   # false로 하면 브라우저 화면 보임 (디버깅용)`}</pre>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 text-gray-100 px-4 py-2 text-xs font-medium">
            3️⃣ 러너 실행
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 text-xs overflow-x-auto">{`# 직접 실행
DASHBOARD_URL=${siteUrl} \\
BLOG_RUNNER_SECRET=your-secret \\
npx ts-node scripts/naver-blog-runner.ts

# PM2로 상시 실행 (권장)
npm install -g pm2
pm2 start scripts/naver-blog-runner.ts \\
  --interpreter="npx ts-node" \\
  --name="naver-blog-runner" \\
  --env DASHBOARD_URL=${siteUrl} \\
  --env BLOG_RUNNER_SECRET=your-secret
pm2 save && pm2 startup`}</pre>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 text-gray-100 px-4 py-2 text-xs font-medium">
            4️⃣ Vercel 환경변수 추가
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 text-xs overflow-x-auto">{`# Vercel 대시보드 → Settings → Environment Variables
BLOG_RUNNER_SECRET=your-secret-key-here
BLOG_ENCRYPTION_KEY=64자리-hex-키   # openssl rand -hex 32`}</pre>
        </div>
      </div>

      {/* 주의사항 */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
        <div className="font-medium text-red-700 mb-2">⚠️ 네이버 자동화 주의사항</div>
        <ul className="text-xs space-y-1.5 text-red-600">
          <li>• 네이버는 자동화 로그인을 탐지하면 <strong>보안 인증(캡차)</strong>을 요구할 수 있습니다.</li>
          <li>• 처음 로그인 시 <code className="bg-red-100 px-1 rounded">HEADLESS=false</code>로 실행해 수동 인증 후 진행하세요.</li>
          <li>• 과도한 발행(시간당 다수)은 계정 제한의 원인이 될 수 있습니다.</li>
          <li>• <strong>전용 네이버 계정</strong> 사용 권장 (메인 계정 사용 지양).</li>
          <li>• VPN/해외 IP에서 접속 시 보안 인증이 더 자주 발생합니다.</li>
        </ul>
      </div>

      {/* 러너 파일 경로 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <div className="font-medium mb-1">📁 러너 스크립트 위치</div>
        <code className="text-xs bg-blue-100 px-2 py-1 rounded">scripts/naver-blog-runner.ts</code>
        <p className="text-xs mt-2 text-blue-600">
          프로젝트 루트의 <code>scripts/</code> 폴더에 Playwright 러너 스크립트가 있습니다.
          이 파일을 VPS/로컬로 복사하거나 git clone 후 실행하세요.
        </p>
      </div>
    </div>
  )
}
