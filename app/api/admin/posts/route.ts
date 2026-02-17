import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendNewsletterForPost } from '@/lib/email'

/**
 * POST /api/admin/posts - 관리자 세션 인증으로 게시글 생성
 * body: { title, content, excerpt?, category_id?, tags?, cover_image?,
 *         media_urls?, source_url?, is_members_only?, is_published? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: '관리자 권한이 없습니다' }, { status: 403 })
  }

  const body = await request.json()
  const {
    title,
    content,
    excerpt,
    category_id,
    tags,
    cover_image,
    media_urls,
    source_url,
    is_members_only,
    is_published,
  } = body

  if (!title || !content) {
    return NextResponse.json({ error: 'title과 content는 필수입니다' }, { status: 400 })
  }

  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) +
    '-' +
    Date.now()

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200),
      cover_image: cover_image || null,
      media_urls: media_urls || [],
      category_id: category_id || null,
      author_id: user.id,
      tags: tags || [],
      source_url: source_url || null,
      is_members_only: is_members_only || false,
      is_published: is_published !== false,
      is_bot_generated: false,
      published_at: is_published !== false ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 발행 글이면 뉴스레터 자동 발송 (멤버 전용 제외)
  if (is_published !== false && !is_members_only) {
    sendNewsletterForPost({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      cover_image: data.cover_image,
    }).catch((e) => console.error('뉴스레터 발송 실패:', e))
  }

  return NextResponse.json({ data, message: '게시글이 생성되었습니다' }, { status: 201 })
}
