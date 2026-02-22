import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { postToPlatform, Platform } from '@/lib/sns/platforms'

/**
 * GET /api/sns/cron
 * 스케줄된 SNS 게시물을 처리합니다.
 * Vercel Cron 또는 외부 cron 서비스에서 호출합니다.
 * Authorization: Bearer {CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 실행 대기 중인 스케줄 조회
  const { data: schedules } = await admin
    .from('sns_schedules')
    .select('*, template:sns_post_templates(content, media_urls, comments)')
    .eq('is_active', true)
    .lte('next_post_at', now)
    .or(`end_at.is.null,end_at.gte.${now}`)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const schedule of schedules) {
    const content = schedule.template?.content
    if (!content) continue

    for (const platform of schedule.platforms as Platform[]) {
      const { data: conn } = await admin
        .from('sns_connections')
        .select('access_token, platform_user_id, is_active')
        .eq('user_id', schedule.user_id)
        .eq('platform', platform)
        .eq('is_active', true)
        .single()

      if (!conn) {
        await admin.from('sns_post_logs').insert({
          schedule_id: schedule.id,
          template_id: schedule.template_id,
          user_id: schedule.user_id,
          platform,
          status: 'failed',
          error_message: '연결되지 않은 플랫폼',
        })
        continue
      }

      try {
        // 플랫폼별 댓글 찾기
        const platformComment = schedule.template?.comments?.find(
          (c: { platform: string }) => c.platform === platform
        )

        const { id: platformPostId } = await postToPlatform(
          platform,
          conn.access_token,
          conn.platform_user_id || '',
          {
            content,
            mediaUrls: schedule.template?.media_urls || [],
            comment: platformComment?.text,
          },
        )
        await admin.from('sns_post_logs').insert({
          schedule_id: schedule.id,
          template_id: schedule.template_id,
          user_id: schedule.user_id,
          platform,
          status: 'success',
          platform_post_id: platformPostId,
        })
        processed++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await admin.from('sns_post_logs').insert({
          schedule_id: schedule.id,
          template_id: schedule.template_id,
          user_id: schedule.user_id,
          platform,
          status: 'failed',
          error_message: message,
        })
      }
    }

    // next_post_at 갱신
    const interval = schedule.repeat_type === 'hours'
      ? schedule.repeat_interval * 60 * 60 * 1000
      : schedule.repeat_interval * 24 * 60 * 60 * 1000

    const nextPostAt = new Date(new Date(schedule.next_post_at).getTime() + interval)

    // end_at 이후면 스케줄 비활성화
    const shouldDeactivate =
      schedule.end_at && nextPostAt > new Date(schedule.end_at)

    await admin.from('sns_schedules').update({
      next_post_at: nextPostAt.toISOString(),
      total_posted: (schedule.total_posted || 0) + 1,
      is_active: shouldDeactivate ? false : true,
      updated_at: now,
    }).eq('id', schedule.id)
  }

  return NextResponse.json({ processed, total: schedules.length })
}
