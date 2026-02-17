import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

/**
 * POST /api/newsletter/subscribe
 * body: { email, name? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, name } = body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '올바른 이메일을 입력해주세요' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 이미 구독 중인지 확인
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', email)
    .single()

  if (existing) {
    if (existing.is_active) {
      return NextResponse.json({ message: '이미 구독 중인 이메일입니다' }, { status: 200 })
    }
    // 재구독 처리
    await supabase
      .from('newsletter_subscribers')
      .update({ is_active: true, unsubscribed_at: null, name: name || null })
      .eq('email', email)

    return NextResponse.json({ message: '뉴스레터 구독이 재개되었습니다' })
  }

  // 신규 구독
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email, name: name || null })

  if (error) {
    return NextResponse.json({ error: '구독 처리 중 오류가 발생했습니다' }, { status: 500 })
  }

  // 환영 메일 발송 (실패해도 구독은 완료)
  try {
    await sendWelcomeEmail(email, name)
  } catch (e) {
    console.error('환영 메일 발송 실패:', e)
  }

  return NextResponse.json({ message: '구독 완료! 환영 메일을 발송했습니다' }, { status: 201 })
}
