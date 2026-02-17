'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Brain, ArrowLeft, Bell, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface MobileHeaderProps {
  title?: string
  showBack?: boolean
  showWrite?: boolean
}

export default function MobileHeader({ title, showBack, showWrite }: MobileHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const isCommunity = pathname.startsWith('/community')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center px-4">
      {showBack ? (
        <button onClick={() => router.back()} className="mr-3 text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <Link href="/" className="flex items-center gap-1.5 mr-3">
          <Brain className="w-6 h-6 text-indigo-600" />
        </Link>
      )}

      <h1 className="flex-1 font-bold text-gray-900 dark:text-white text-base truncate">
        {title || 'AI 인사이트 카페'}
      </h1>

      <div className="flex items-center gap-2">
        {isCommunity && user && (
          <Link
            href="/community/new"
            className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-white" />
          </Link>
        )}
        {user ? (
          <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {user.email?.[0]?.toUpperCase()}
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-indigo-600">로그인</Link>
        )}
      </div>
    </header>
  )
}
