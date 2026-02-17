import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // record_video_view 함수 호출 (SECURITY DEFINER)
    const adminSupabase = await createAdminClient()
    const { data, error } = await adminSupabase.rpc('record_video_view', {
      p_video_id: videoId,
      p_viewer_id: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = data as {
      success: boolean
      already_viewed?: boolean
      points_deducted?: boolean
      cost?: number
      error?: string
      required?: number
      current?: number
      own_video?: boolean
    }

    if (!result.success) {
      if (result.error === 'insufficient_points') {
        return NextResponse.json(
          {
            error: `포인트가 부족합니다. 필요: ${result.required}P, 현재: ${result.current}P`,
            code: 'insufficient_points',
          },
          { status: 402 }
        )
      }
      if (result.error === 'video_not_found') {
        return NextResponse.json({ error: '동영상을 찾을 수 없습니다' }, { status: 404 })
      }
      return NextResponse.json({ error: '시청 처리 중 오류가 발생했습니다' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
