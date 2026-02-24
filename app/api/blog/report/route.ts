import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/blog/report
 * 외부 Playwright 러너가 발행 결과를 보고합니다.
 * Authorization: Bearer {BLOG_RUNNER_SECRET}
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.BLOG_RUNNER_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { post_id, success, platform_post_id, error_message } = await req.json()
  if (!post_id) return NextResponse.json({ error: 'post_id 필요' }, { status: 400 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 포스트 상태 업데이트
  const { data: post } = await admin
    .from('blog_posts')
    .select('user_id, retry_count')
    .eq('id', post_id)
    .single()

  if (!post) return NextResponse.json({ error: '포스트를 찾을 수 없습니다' }, { status: 404 })

  if (success) {
    await admin.from('blog_posts').update({
      status: 'published',
      platform_post_id: platform_post_id || null,
      published_at: now,
      error_message: null,
      updated_at: now,
    }).eq('id', post_id)
  } else {
    const newRetryCount = (post.retry_count || 0) + 1
    const isFinalFailure = newRetryCount >= 3
    await admin.from('blog_posts').update({
      status: isFinalFailure ? 'failed' : 'queued', // 3회 실패 시 failed
      error_message: error_message || '알 수 없는 오류',
      retry_count: newRetryCount,
      updated_at: now,
    }).eq('id', post_id)
  }

  // 로그 기록
  await admin.from('blog_publish_logs').insert({
    post_id,
    user_id: post.user_id,
    status: success ? 'success' : 'failed',
    platform_post_id: success ? platform_post_id : null,
    error_message: success ? null : error_message,
    runner_type: 'playwright',
  })

  return NextResponse.json({ success: true })
}
