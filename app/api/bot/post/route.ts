import { NextRequest, NextResponse } from 'next/server'
import { botCreatePost, validateBotApiKey } from '@/lib/bot'

/**
 * POST /api/bot/post
 * 봇이 자동으로 게시글을 생성하는 엔드포인트
 *
 * Authorization: Bearer {BOT_API_SECRET}
 *
 * Body:
 * {
 *   "title": "게시글 제목",
 *   "content": "내용",
 *   "excerpt": "요약 (선택)",
 *   "category_slug": "ai-news",
 *   "tags": ["AI", "ChatGPT"],
 *   "cover_image": "이미지 URL (선택)",
 *   "source_url": "원문 URL (선택)",
 *   "is_members_only": false
 * }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey || !validateBotApiKey(apiKey)) {
    return NextResponse.json(
      { error: '유효하지 않은 API 키입니다. Authorization: Bearer {BOT_API_SECRET} 헤더를 확인하세요.' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '유효하지 않은 JSON 형식입니다' }, { status: 400 })
  }

  const { title, content, excerpt, category_slug, tags, cover_image, source_url, is_members_only } = body as {
    title?: string
    content?: string
    excerpt?: string
    category_slug?: string
    tags?: string[]
    cover_image?: string
    source_url?: string
    is_members_only?: boolean
  }

  if (!title || !content) {
    return NextResponse.json(
      { error: 'title과 content는 필수 필드입니다' },
      { status: 400 }
    )
  }

  const result = await botCreatePost({
    title,
    content,
    excerpt,
    category_slug,
    tags,
    cover_image,
    source_url,
    is_members_only,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(
    {
      message: '게시글이 성공적으로 생성되었습니다',
      post_id: result.post_id,
    },
    { status: 201 }
  )
}

/**
 * GET /api/bot/post - 봇 작업 로그 조회
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey || !validateBotApiKey(apiKey)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('bot_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
