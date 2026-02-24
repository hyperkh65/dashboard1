'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Brain, Menu, X, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Brain className="w-7 h-7 text-indigo-600" />
            <span className="gradient-text">AI 인사이트 허브</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/posts" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              AI 인사이트
            </Link>
            <Link href="/courses" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              강의
            </Link>
            <Link href="/community" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              커뮤니티
            </Link>
            <Link href="/membership" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              멤버십
            </Link>
            <Link href="/sites" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              사이트
            </Link>
            <Link href="/sns" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              SNS
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium">
              블로그
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/admin" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  관리자
                </Link>
                <Link href="/profile" className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                  로그인
                </Link>
                <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  무료 가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 space-y-2">
            {[
              { href: '/posts', label: 'AI 인사이트' },
              { href: '/courses', label: '강의' },
              { href: '/community', label: '커뮤니티' },
              { href: '/membership', label: '멤버십' },
              { href: '/sites', label: '사이트' },
              { href: '/sns', label: 'SNS' },
              { href: '/blog', label: '블로그' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-gray-600 hover:text-indigo-600 dark:text-gray-300 font-medium"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              {user ? (
                <button onClick={handleSignOut} className="text-sm text-red-500">로그아웃</button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600">로그인</Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg">무료 가입</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
