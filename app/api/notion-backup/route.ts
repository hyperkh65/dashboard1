import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncPostToNotion } from '@/lib/notion'
import { validateBotApiKey } from '@/lib/bot'

/**
 * POST /api/notion-backup
 * 특정 게시글 또는 모든 게시글을 Notion에 백업
 *
 * Body:
 * { "post_id": "uuid" }  - 특정 게시글
 * { "sync_all": true }   - 전체 동기화
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey || !validateBotApiKey(apiKey)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const body = await request.json()
  const { post_id, sync_all } = body
  const supabase = createAdminClient()

  if (sync_all) {
    // 전체 동기화
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('is_published', true)
      .is('notion_page_id', null)
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const results = []
    for (const post of posts || []) {
      const notionId = await syncPostToNotion(post)
      if (notionId) {
        await supabase.from('posts').update({ notion_page_id: notionId }).eq('id', post.id)
        await supabase.from('notion_sync_logs').insert({
          post_id: post.id,
          notion_page_id: notionId,
          sync_type: 'create',
          status: 'success',
        })
        results.push({ post_id: post.id, notion_page_id: notionId, status: 'success' })
      } else {
        results.push({ post_id: post.id, status: 'failed' })
      }
    }

    return NextResponse.json({
      message: `${results.length}개 게시글 동기화 완료`,
      results,
    })
  }

  if (post_id) {
    // 특정 게시글 동기화
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
    }

    const notionId = await syncPostToNotion(post)
    if (notionId) {
      await supabase.from('posts').update({ notion_page_id: notionId }).eq('id', post.id)
      await supabase.from('notion_sync_logs').insert({
        post_id: post.id,
        notion_page_id: notionId,
        sync_type: post.notion_page_id ? 'update' : 'create',
        status: 'success',
      })
      return NextResponse.json({ message: 'Notion 동기화 성공', notion_page_id: notionId })
    }

    return NextResponse.json({ error: 'Notion 동기화 실패' }, { status: 500 })
  }

  return NextResponse.json({ error: 'post_id 또는 sync_all 필드가 필요합니다' }, { status: 400 })
}

/**
 * GET /api/notion-backup - 동기화 로그 조회
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.replace('Bearer ', '') !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('notion_sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
