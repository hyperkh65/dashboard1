'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle } from 'lucide-react'

export default function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: name || undefined }),
    })
    const data = await res.json()

    if (!res.ok && res.status !== 200) {
      setError(data.error || '오류가 발생했습니다')
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className={`flex items-center gap-3 text-green-600 dark:text-green-400 ${compact ? 'justify-center' : ''}`}>
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">구독 완료! 환영 메일을 확인해주세요.</p>
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="이메일 주소"
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          구독
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </form>
    )
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-indigo-100 dark:border-indigo-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">뉴스레터 구독</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">새 글 발행 시 메일로 알려드려요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 mt-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 (선택)"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="이메일 주소 *"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {loading ? '처리 중...' : '무료 구독하기'}
        </button>
        <p className="text-xs text-center text-gray-400">언제든 구독 취소 가능 · 스팸 없음</p>
      </form>
    </div>
  )
}
