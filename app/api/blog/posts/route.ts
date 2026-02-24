import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET: 포스트 목록
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // draft | queued | published | failed | all

  const admin = createAdminClient()
  let query = admin
    .from('blog_posts')
    .select(`
      id, title, content, category_no, tags, media_urls,
      status, scheduled_at, published_at, platform_post_id,
      error_message, retry_count, created_at, updated_at,
      account:blog_accounts(id, naver_id, blog_id, blog_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

// POST: 포스트 작성
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await req.json()
  const { title, content, account_id, category_no, tags, media_urls, scheduled_at, status } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('blog_posts')
    .insert({
      user_id: user.id,
      account_id: account_id || null,
      title: title.trim(),
      content: content.trim(),
      category_no: category_no ?? 0,
      tags: tags || [],
      media_urls: media_urls || [],
      status: status || 'draft',
      scheduled_at: scheduled_at || null,
    })
    .select('id, title, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, post: data })
}
