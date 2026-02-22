import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sns_connections')
    .select('platform, platform_username, platform_display_name, platform_avatar, is_active, updated_at')
    .eq('user_id', user.id)

  console.log('[SNS Connections API]', {
    user_id: user.id,
    data_count: data?.length || 0,
    data,
    error
  })

  if (error) {
    console.error('[SNS Connections API] DB 조회 실패:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// 연결 해제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { platform } = await req.json()
  const admin = createAdminClient()
  await admin
    .from('sns_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform)

  return NextResponse.json({ success: true })
}
