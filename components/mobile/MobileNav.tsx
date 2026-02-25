'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, BookOpen, TrendingUp, User, Share2, PenLine } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: '홈', icon: Home },
  { href: '/community', label: '카페', icon: MessageSquare },
  { href: '/posts', label: '인사이트', icon: TrendingUp },
  { href: '/courses', label: '강의', icon: BookOpen },
  { href: '/sns', label: 'SNS', icon: Share2 },
  { href: '/blog', label: '블로그', icon: PenLine },
  { href: '/profile', label: '내 정보', icon: User },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="grid grid-cols-7 h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
