import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/newsletter/unsubscribe?token=xxx
 * GET /api/newsletter/unsubscribe?email=xxx  (fallback)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token && !email) {
    return new NextResponse('잘못된 요청입니다', { status: 400 })
  }

  const supabase = createAdminClient()

  const query = token
    ? supabase.from('newsletter_subscribers').update({ is_active: false, unsubscribed_at: new Date().toISOString() }).eq('unsubscribe_token', token)
    : supabase.from('newsletter_subscribers').update({ is_active: false, unsubscribed_at: new Date().toISOString() }).eq('email', email!)

  const { error } = await query

  if (error) {
    return new NextResponse('오류가 발생했습니다. 다시 시도해주세요.', { status: 500 })
  }

  return new NextResponse(`
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="background:#fff;border-radius:16px;padding:48px 40px;text-align:center;max-width:400px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="font-size:48px;margin-bottom:16px;">👋</div>
    <h2 style="color:#111827;margin:0 0 12px;">구독이 해제되었습니다</h2>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">더 이상 뉴스레터를 받지 않습니다.<br>언제든 다시 구독하실 수 있어요.</p>
    <a href="https://club.2days.kr" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">사이트로 돌아가기</a>
  </div>
</body>
</html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
