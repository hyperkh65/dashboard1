import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sns_schedules')
    .select('*, template:sns_post_templates(id, title, content)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const {
    template_id,
    platforms,
    repeat_type,
    repeat_interval,
    start_at,
    end_at,
  } = await req.json()

  if (!template_id || !platforms?.length || !repeat_type || !repeat_interval || !start_at) {
    return NextResponse.json({ error: '필수 항목을 모두 입력해주세요' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 소유 템플릿 확인
  const { data: tpl } = await admin
    .from('sns_post_templates')
    .select('id')
    .eq('id', template_id)
    .eq('user_id', user.id)
    .single()
  if (!tpl) return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })

  const startDate = new Date(start_at)
  const { data, error } = await admin
    .from('sns_schedules')
    .insert({
      user_id: user.id,
      template_id,
      platforms,
      repeat_type,
      repeat_interval: Number(repeat_interval),
      start_at: startDate.toISOString(),
      end_at: end_at || null,
      next_post_at: startDate.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
