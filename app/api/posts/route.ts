import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/posts - 게시글 목록 조회
 * Query params: category, page, limit, tag
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const tag = searchParams.get('tag')

  const supabase = createAdminClient()
  let query = supabase
    .from('posts')
    .select('id, title, slug, excerpt, cover_image, tags, is_members_only, view_count, like_count, published_at, is_bot_generated, category:categories(name, slug), author:profiles(username, full_name)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count },
  })
}

/**
 * POST /api/posts - 게시글 생성 (관리자 또는 봇)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (apiKey !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const body = await request.json()
  const { title, content, excerpt, category_slug, tags, cover_image, media_urls, source_url, is_members_only } = body

  if (!title || !content) {
    return NextResponse.json({ error: 'title과 content는 필수입니다' }, { status: 400 })
  }

  const supabase = createAdminClient()

  let categoryId: string | null = null
  if (category_slug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', category_slug).single()
    categoryId = cat?.id || null
  }

  const slug = `${title.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, '').replace(/\s+/g, '-').substring(0, 50)}-${Date.now()}`

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200),
      cover_image: cover_image || null,
      media_urls: media_urls || [],
      category_id: categoryId,
      tags: tags || [],
      source_url: source_url || null,
      is_members_only: is_members_only || false,
      is_published: true,
      is_bot_generated: true,
      published_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, message: '게시글이 생성되었습니다' }, { status: 201 })
}
