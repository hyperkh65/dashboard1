'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Crown, Save, Search, Shield } from 'lucide-react'
import GradeBadge from '@/components/GradeBadge'
import { Grade, GRADE_INFO } from '@/types'

const GRADE_OPTIONS: Grade[] = ['씨앗', '새싹', '잎새', '나무', '열매', 'staff']

export default function AdminMembersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
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
        .from('profiles')
        .select('id, username, full_name, email, grade, post_count, comment_count, is_admin, cafe_joined_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleGradeUpdate = async (memberId: string, newGrade: Grade) => {
    setSaving(memberId)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({ grade: newGrade, grade_updated_at: new Date().toISOString() })
      .eq('id', memberId)

    if (error) {
      setError('등급 변경 실패: ' + error.message)
    } else {
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, grade: newGrade } : m))
      setSuccess('등급이 변경되었습니다!')
      setTimeout(() => setSuccess(''), 2000)
    }
    setSaving(null)
  }

  const handleAdminToggle = async (memberId: string, isAdmin: boolean) => {
    if (!confirm(isAdmin ? '이 회원의 관리자 권한을 해제하시겠습니까?' : '이 회원에게 관리자 권한을 부여하시겠습니까?')) return
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !isAdmin })
      .eq('id', memberId)

    if (!error) {
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_admin: !isAdmin } : m))
    }
  }

  const filtered = members.filter((m) =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const gradeStats = GRADE_OPTIONS.reduce((acc, g) => {
    acc[g] = members.filter((m) => m.grade === g).length
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        로딩 중...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">멤버 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {members.length}명의 멤버 · 등급 수동 조정 가능</p>
        </div>
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

      {/* 등급별 통계 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {GRADE_OPTIONS.map((grade) => {
          const info = GRADE_INFO[grade]
          return (
            <div key={grade} className={`rounded-xl p-3 text-center ${info.bg}`}>
              <div className="text-2xl mb-1">{info.emoji}</div>
              <div className={`text-xs font-medium ${info.color}`}>{info.label}</div>
              <div className={`text-xl font-bold ${info.color}`}>{gradeStats[grade] || 0}</div>
            </div>
          )
        })}
      </div>

      {/* 검색 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 아이디, 이메일로 검색..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 멤버 목록 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">멤버</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">현재 등급</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">활동</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">등급 변경</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">관리자</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {member.full_name?.[0] || member.username?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {member.full_name || member.username || '이름 없음'}
                      </div>
                      <div className="text-xs text-gray-400">{member.email || '@' + member.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <GradeBadge grade={(member.grade || '씨앗') as Grade} size="sm" />
                </td>
                <td className="px-4 py-4 text-xs text-gray-500">
                  <div>게시글 {member.post_count || 0}개</div>
                  <div>댓글 {member.comment_count || 0}개</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={member.grade || '씨앗'}
                      onChange={(e) => handleGradeUpdate(member.id, e.target.value as Grade)}
                      disabled={saving === member.id}
                      className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{GRADE_INFO[g].emoji} {GRADE_INFO[g].label}</option>
                      ))}
                    </select>
                    {saving === member.id && (
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleAdminToggle(member.id, member.is_admin)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      member.is_admin
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {member.is_admin ? (
                      <><Crown className="w-3.5 h-3.5" /> 관리자</>
                    ) : (
                      <><Shield className="w-3.5 h-3.5" /> 일반</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">검색 결과가 없습니다</div>
        )}
      </div>
    </div>
  )
}
