import Link from 'next/link'
import { Brain, Twitter, Youtube, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-7 h-7 text-indigo-500" />
              <span className="text-white font-bold text-lg">AI 인사이트 허브</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              AI 시대를 선도하는 사람들을 위한 플랫폼.<br />
              최신 AI 인사이트, 실용적인 강의, 활발한 커뮤니티를 만나보세요.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">콘텐츠</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/posts', label: 'AI 인사이트' },
                { href: '/courses', label: '강의' },
                { href: '/community', label: '커뮤니티' },
                { href: '/membership', label: '멤버십' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">개발자</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/api-docs" className="hover:text-white transition-colors">API 문서</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">관리자</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
          <p>© 2026 AI 인사이트 허브. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
