import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// PUT: 포스트 수정
export async function PUT(
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
  if (body.title !== undefined) updates.title = body.title
  if (body.content !== undefined) updates.content = body.content
  if (body.category_no !== undefined) updates.category_no = body.category_no
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.media_urls !== undefined) updates.media_urls = body.media_urls
  if (body.status !== undefined) updates.status = body.status
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at
  if (body.account_id !== undefined) updates.account_id = body.account_id

  // queued 상태로 변경 시 retry_count 초기화
  if (body.status === 'queued') {
    updates.retry_count = 0
    updates.error_message = null
  }

  const { error } = await admin
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: 포스트 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const admin = createAdminClient()
  await admin.from('blog_posts').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
