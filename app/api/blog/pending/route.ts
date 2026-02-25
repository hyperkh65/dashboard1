import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptPassword } from '@/lib/blog/crypto'

/**
 * GET /api/blog/pending
 * 외부 Playwright 러너가 발행 대기 중인 포스트를 가져갑니다.
 * Authorization: Bearer {BLOG_RUNNER_SECRET}
 *
 * 반환: 암호화된 자격증명 포함 (복호화 후 전달)
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.BLOG_RUNNER_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 발행 대기 중인 포스트 조회 (예약 시간 도달 또는 즉시 발행)
  const { data: posts } = await admin
    .from('blog_posts')
    .select(`
      id, title, content, category_no, tags, media_urls,
      retry_count, scheduled_at,
      account:blog_accounts(id, naver_id, naver_pw_enc, blog_id, blog_name)
    `)
    .eq('status', 'queued')
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .lt('retry_count', 3)
    .limit(5) // 한 번에 최대 5개

  if (!posts || posts.length === 0) {
    return NextResponse.json({ posts: [] })
  }

  // 비밀번호 복호화 후 반환 (러너는 HTTPS로만 접근해야 함)
  const result = posts.map((p) => {
    const account = Array.isArray(p.account) ? p.account[0] : p.account
    let naverPw = ''
    if (account?.naver_pw_enc) {
      try {
        naverPw = decryptPassword(account.naver_pw_enc)
      } catch {
        naverPw = ''
      }
    }
    return {
      id: p.id,
      title: p.title,
      content: p.content,
      category_no: p.category_no,
      tags: p.tags,
      media_urls: p.media_urls,
      retry_count: p.retry_count,
      naver_id: account?.naver_id || '',
      naver_pw: naverPw,
      blog_id: account?.blog_id || '',
    }
  })

  // 가져간 포스트를 publishing 상태로 변경
  const postIds = posts.map((p) => p.id)
  await admin
    .from('blog_posts')
    .update({ status: 'publishing', updated_at: now })
    .in('id', postIds)

  return NextResponse.json({ posts: result })
}
