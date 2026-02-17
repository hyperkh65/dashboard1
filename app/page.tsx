import Link from 'next/link'
import { ArrowRight, BookOpen, Users, Zap, Star, TrendingUp, Bot } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI 시대를 앞서가세요
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            AI 인사이트와 지식으로<br />
            <span className="gradient-text">미래를 준비하세요</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            최신 AI 뉴스, 실전 강의, 그리고 AI를 활용하는 커뮤니티와 함께<br />
            디지털 전환 시대의 앞서가는 인재가 되세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 flex items-center gap-2 justify-center"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/courses"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold px-8 py-4 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:scale-105 flex items-center gap-2 justify-center"
            >
              강의 둘러보기
              <BookOpen className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-gray-900 py-12 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '1,000+', label: 'AI 인사이트 아티클' },
              { value: '50+', label: '강의 & 튜토리얼' },
              { value: '5,000+', label: '커뮤니티 멤버' },
              { value: '매일', label: '새 콘텐츠 업데이트' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              AI 성장을 위한 모든 것
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              인사이트부터 실전 강의, 커뮤니티까지 AI 역량 강화에 필요한 모든 것을 한 곳에서
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                title: 'AI 인사이트 & 뉴스',
                desc: '매일 업데이트되는 최신 AI 트렌드, 도구 리뷰, 활용 사례를 빠르게 파악하세요.',
                href: '/posts',
                cta: '인사이트 보기',
              },
              {
                icon: BookOpen,
                color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                title: '실전 AI 강의',
                desc: 'ChatGPT, 미드저니, 클로드 등 실무에 바로 적용할 수 있는 AI 도구 강의를 배워보세요.',
                href: '/courses',
                cta: '강의 시작하기',
              },
              {
                icon: Users,
                color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
                title: 'AI 커뮤니티',
                desc: 'AI를 활용하는 사람들과 함께 성장하세요. 질문, 공유, 토론으로 더 빠르게 배웁니다.',
                href: '/community',
                cta: '커뮤니티 참여',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 card-hover"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-5`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                  {feature.desc}
                </p>
                <Link
                  href={feature.href}
                  className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                >
                  {feature.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bot Feature */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 text-white text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Bot className="w-4 h-4" />
              AI 자동화 시스템
            </div>
            <h2 className="text-3xl font-bold mb-4">자동으로 업데이트되는 AI 콘텐츠</h2>
            <p className="text-indigo-100 max-w-xl mx-auto mb-8">
              봇이 24시간 최신 AI 뉴스와 인사이트를 수집하고 정리합니다.
              Notion에도 자동으로 백업되어 언제 어디서나 접근 가능합니다.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              {[
                { label: '자동 포스팅', desc: '봇이 24/7 콘텐츠 생성' },
                { label: 'Notion 백업', desc: '모든 글 자동 동기화' },
                { label: 'API 제공', desc: '외부 연동 완전 지원' },
              ].map((item) => (
                <div key={item.label} className="bg-white/10 rounded-xl p-4">
                  <div className="font-semibold mb-1">{item.label}</div>
                  <div className="text-indigo-200 text-sm">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">멤버십 플랜</h2>
            <p className="text-gray-600 dark:text-gray-400">원하는 플랜을 선택하고 AI 여정을 시작하세요</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '무료',
                features: ['기본 AI 인사이트', '커뮤니티 참여', '무료 강의 일부'],
                cta: '시작하기',
                href: '/signup',
                highlighted: false,
              },
              {
                name: 'Basic',
                price: '월 9,900원',
                features: ['모든 AI 인사이트', '전체 강의 접근', '멤버 전용 커뮤니티', 'Notion 연동'],
                cta: '베이직 시작',
                href: '/membership',
                highlighted: true,
              },
              {
                name: 'Premium',
                price: '월 29,900원',
                features: ['베이직 모든 기능', 'AI 봇 API 접근', '1:1 멘토링', '그룹 스터디'],
                cta: '프리미엄 시작',
                href: '/membership',
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border ${
                  plan.highlighted
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className={`font-semibold mb-1 ${plan.highlighted ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {plan.name}
                </div>
                <div className={`text-3xl font-bold mb-6 ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {plan.price}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className={`flex items-center gap-2 text-sm ${plan.highlighted ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      <Star className="w-4 h-4 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
