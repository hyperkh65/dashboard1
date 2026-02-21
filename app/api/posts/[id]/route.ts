import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/posts/[id] - 단일 게시글 조회 (slug 또는 id)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('posts')
    .select('*, category:categories(*), author:profiles(username, full_name, avatar_url)')
    .or(`id.eq.${id},slug.eq.${id}`)
    .eq('is_published', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

/**
 * PUT /api/posts/[id] - 게시글 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.replace('Bearer ', '') !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('posts')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/**
 * DELETE /api/posts/[id] - 게시글 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.replace('Bearer ', '') !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: '삭제되었습니다' })
}
