import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/courses - 강의 목록
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level')
  const isFree = searchParams.get('free')

  const supabase = createAdminClient()
  let query = supabase
    .from('courses')
    .select('*, instructor:profiles(username, full_name, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (level) query = query.eq('level', level)
  if (isFree === 'true') query = query.eq('is_free', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

/**
 * POST /api/courses - 강의 생성 (관리자)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.replace('Bearer ', '') !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, thumbnail, price, is_free, is_members_only, level, category, tags } = body

  if (!title) return NextResponse.json({ error: 'title은 필수입니다' }, { status: 400 })

  const supabase = createAdminClient()
  const slug = `${title.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, '').replace(/\s+/g, '-').substring(0, 50)}-${Date.now()}`

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title,
      slug,
      description,
      thumbnail,
      price: price || 0,
      is_free: is_free !== false,
      is_members_only: is_members_only || false,
      level: level || 'beginner',
      category,
      tags: tags || [],
      is_published: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
