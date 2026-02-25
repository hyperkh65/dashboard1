import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// DELETE: 계정 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const admin = createAdminClient()
  await admin.from('blog_accounts').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}

// PATCH: 계정 수정 (비밀번호 변경 등)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.blog_id) updates.blog_id = body.blog_id
  if (body.blog_name) updates.blog_name = body.blog_name
  if (body.is_active !== undefined) updates.is_active = body.is_active

  if (body.naver_pw) {
    const { encryptPassword } = await import('@/lib/blog/crypto')
    updates.naver_pw_enc = encryptPassword(body.naver_pw)
  }

  const { error } = await admin
    .from('blog_accounts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
