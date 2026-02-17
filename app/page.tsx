import Link from 'next/link'
import { ArrowRight, BookOpen, Users, Zap, Star, TrendingUp, Coffee, Shield, Award, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI 인사이트로 앞서가세요
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            AI 인사이트를 얻고<br />
            <span className="gradient-text">미래를 함께 준비하세요</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            검증된 AI 활용 노하우, 실전 강의, 그리고 함께 성장하는 커뮤니티.<br />
            지금 가입하면 <strong className="text-indigo-600 dark:text-indigo-400">평생 무료</strong>로 카페를 이용할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 flex items-center gap-2 justify-center"
            >
              평생 무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/community"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold px-8 py-4 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:scale-105 flex items-center gap-2 justify-center"
            >
              카페 둘러보기
              <Users className="w-5 h-5" />
            </Link>
          </div>

          {/* 무료 배지 */}
          <div className="mt-8 inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-full px-5 py-2 text-sm font-medium">
            <Coffee className="w-4 h-4" />
            지금 가입 시 평생 카페 멤버십 무료 제공
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
              { value: '5,000+', label: '카페 멤버' },
              { value: '평생', label: '신규 가입 무료 혜택' },
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
              AI 인사이트를 얻는 가장 좋은 방법
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              검증된 AI 활용법부터 실전 강의, 커뮤니티 게시판까지 AI 성장에 필요한 모든 것
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                title: 'AI 인사이트 & 뉴스',
                desc: '전문가가 선별한 최신 AI 트렌드, 도구 리뷰, 실전 활용 사례로 빠르게 인사이트를 얻으세요.',
                href: '/posts',
                cta: '인사이트 보기',
              },
              {
                icon: BookOpen,
                color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                title: '실전 AI 강의',
                desc: 'ChatGPT, 미드저니, 클로드 등 실무에 바로 적용할 수 있는 AI 도구 강의로 역량을 키우세요.',
                href: '/courses',
                cta: '강의 시작하기',
              },
              {
                icon: Users,
                color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
                title: 'AI 인사이트 카페',
                desc: '게시판, 사진/동영상 공유, 등급 시스템으로 운영되는 활발한 AI 커뮤니티에 참여하세요.',
                href: '/community',
                cta: '카페 참여하기',
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

      {/* 평생 무료 카페 가입 섹션 */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 text-white">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                  <Coffee className="w-4 h-4" />
                  지금 바로 시작하세요
                </div>
                <h2 className="text-3xl font-bold mb-4">평생 무료 카페 가입</h2>
                <p className="text-indigo-100 mb-8 leading-relaxed">
                  AI 인사이트 카페에 지금 가입하면 평생 동안 모든 게시판과 콘텐츠를 무료로 이용할 수 있습니다.
                  활동을 통해 등급을 올리고 더 많은 혜택을 누리세요.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  무료 가입하기
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Sparkles, label: '다양한 게시판', desc: '공지, 자유, Q&A, 인사이트 등 6개 게시판' },
                  { icon: Shield, label: '사진/동영상 공유', desc: '이미지와 영상을 자유롭게 업로드' },
                  { icon: Award, label: '등급 업 시스템', desc: '씨앗 → 새싹 → 잎새 → 나무 → 열매' },
                  { icon: Star, label: '활동 혜택', desc: '활동할수록 자동으로 등급 상승' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/10 rounded-xl p-5">
                    <item.icon className="w-6 h-6 mb-3 text-white" />
                    <div className="font-semibold mb-1 text-sm">{item.label}</div>
                    <div className="text-indigo-200 text-xs leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 등급 시스템 안내 */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">등급 성장 시스템</h2>
            <p className="text-gray-600 dark:text-gray-400">활동하면 자동으로 등급이 올라갑니다</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { emoji: '🌱', grade: '씨앗', desc: '가입 직후', color: 'border-green-200 dark:border-green-800' },
              { emoji: '🌿', grade: '새싹', desc: '7일+ 또는 활동 5회', color: 'border-emerald-200 dark:border-emerald-800' },
              { emoji: '🍃', grade: '잎새', desc: '30일+ AND 활동 10회', color: 'border-teal-200 dark:border-teal-800' },
              { emoji: '🌳', grade: '나무', desc: '90일+ AND 활동 30회', color: 'border-cyan-200 dark:border-cyan-800' },
              { emoji: '🍎', grade: '열매', desc: '180일+ AND 활동 100회', color: 'border-orange-200 dark:border-orange-800' },
              { emoji: '👑', grade: '스탭', desc: '운영진 (관리자 부여)', color: 'border-yellow-200 dark:border-yellow-800' },
            ].map((item, index) => (
              <div key={item.grade} className="flex items-center gap-2">
                <div className={`bg-white dark:bg-gray-900 rounded-xl border-2 ${item.color} px-5 py-4 text-center min-w-[110px]`}>
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{item.grade}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</div>
                </div>
                {index < 5 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">멤버십 플랜</h2>
            <p className="text-gray-600 dark:text-gray-400">원하는 플랜을 선택하고 AI 인사이트를 얻으세요</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '무료',
                badge: '평생 카페 무료',
                features: ['기본 AI 인사이트', '카페 게시판 참여', '등급 성장 시스템', '무료 강의 일부'],
                cta: '무료로 시작하기',
                href: '/signup',
                highlighted: false,
              },
              {
                name: 'Basic',
                price: '월 5,000원',
                badge: '가장 인기',
                features: ['모든 AI 인사이트', '전체 강의 접근', '멤버 전용 게시판', 'Notion 연동'],
                cta: '베이직 시작',
                href: '/membership',
                highlighted: true,
              },
              {
                name: 'Premium',
                price: '월 10,000원',
                badge: '최고 혜택',
                features: ['베이직 모든 기능', 'AI 봇 API 접근', '1:1 멘토링', '그룹 스터디'],
                cta: '프리미엄 시작',
                href: '/membership',
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border relative ${
                  plan.highlighted
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${
                    plan.highlighted ? 'bg-amber-400 text-amber-900' : 'bg-green-500 text-white'
                  }`}>
                    {plan.badge}
                  </div>
                )}
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
