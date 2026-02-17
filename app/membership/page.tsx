import Link from 'next/link'
import { Check, Zap, Star, Crown } from 'lucide-react'

export default function MembershipPage() {
  const plans = [
    {
      name: 'Free',
      icon: Zap,
      price: '무료',
      period: '',
      color: 'gray',
      features: [
        '기본 AI 인사이트 (월 10개)',
        '커뮤니티 참여',
        '무료 강의 접근',
        '기본 API 접근 (읽기 전용)',
      ],
      notIncluded: ['멤버 전용 콘텐츠', '전체 강의 접근', 'Notion 연동', '봇 API 사용'],
      cta: '무료로 시작',
      href: '/signup',
      highlighted: false,
    },
    {
      name: 'Basic',
      icon: Star,
      price: '5,000',
      period: '/월',
      color: 'indigo',
      features: [
        '모든 AI 인사이트 무제한',
        '전체 강의 접근',
        '멤버 전용 커뮤니티',
        'Notion 자동 백업 연동',
        '읽기 API 완전 접근',
      ],
      notIncluded: ['봇 API 사용', '1:1 멘토링'],
      cta: 'Basic 시작하기',
      href: '/signup?plan=basic',
      highlighted: true,
    },
    {
      name: 'Premium',
      icon: Crown,
      price: '10,000',
      period: '/월',
      color: 'purple',
      features: [
        'Basic 모든 기능',
        'AI 봇 API 완전 접근',
        '커스텀 봇 설정',
        '1:1 멘토링 (월 1회)',
        '그룹 스터디 참여',
        '우선 고객 지원',
      ],
      notIncluded: [],
      cta: 'Premium 시작하기',
      href: '/signup?plan=premium',
      highlighted: false,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          AI 성장을 위한 멤버십
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          목적에 맞는 플랜을 선택하고 AI 인사이트 허브의 모든 혜택을 누려보세요.
          언제든지 업그레이드하거나 취소할 수 있습니다.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-8 ${
              plan.highlighted
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full">
                가장 인기 있는 플랜
              </div>
            )}

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
              plan.highlighted
                ? 'bg-white/20'
                : plan.color === 'purple'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <plan.icon className={`w-6 h-6 ${
                plan.highlighted ? 'text-white' :
                plan.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                'text-gray-500'
              }`} />
            </div>

            <div className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {plan.name}
            </div>
            <div className={`text-4xl font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {plan.price === '무료' ? '무료' : `₩${plan.price}`}
              <span className={`text-lg font-normal ${plan.highlighted ? 'text-indigo-200' : 'text-gray-400'}`}>
                {plan.period}
              </span>
            </div>

            <Link
              href={plan.href}
              className={`block text-center py-3 rounded-xl font-semibold mt-6 mb-8 transition-colors ${
                plan.highlighted
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {plan.cta}
            </Link>

            <div className="space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className={`flex items-start gap-2.5 text-sm ${plan.highlighted ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-green-300' : 'text-green-500'}`} />
                  {feature}
                </div>
              ))}
              {plan.notIncluded.map((feature) => (
                <div key={feature} className={`flex items-start gap-2.5 text-sm opacity-40 line-through ${plan.highlighted ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-600'}`}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-10">자주 묻는 질문</h2>
        <div className="max-w-2xl mx-auto space-y-4">
          {[
            {
              q: '언제든지 취소할 수 있나요?',
              a: '네, 언제든지 취소 가능합니다. 취소 후에도 결제 기간 만료일까지 서비스를 이용할 수 있습니다.',
            },
            {
              q: 'AI 봇 API는 어떻게 사용하나요?',
              a: 'Premium 멤버에게는 API 키가 발급됩니다. /api-docs 페이지에서 상세한 사용 방법을 확인하세요.',
            },
            {
              q: 'Notion 연동은 어떻게 하나요?',
              a: 'Basic 이상 멤버는 Notion API를 통해 모든 게시글이 자동으로 Notion 데이터베이스에 백업됩니다.',
            },
          ].map((faq) => (
            <div key={faq.q} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.q}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
