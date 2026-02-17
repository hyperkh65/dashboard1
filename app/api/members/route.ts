import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBotApiKey } from '@/lib/bot'

/**
 * GET /api/members - 멤버 목록 (관리자용)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!validateBotApiKey(authHeader?.replace('Bearer ', '') || '')) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, is_member, membership_tier, membership_expires_at, created_at')
    .eq('is_member', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/**
 * POST /api/members - 멤버십 업데이트
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!validateBotApiKey(authHeader?.replace('Bearer ', '') || '')) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const body = await request.json()
  const { user_id, tier, expires_at } = body

  if (!user_id || !tier) {
    return NextResponse.json({ error: 'user_id와 tier는 필수입니다' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_member: true,
      membership_tier: tier,
      membership_expires_at: expires_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, message: '멤버십이 업데이트되었습니다' })
}
