import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { GRADE_VIDEO_MAX_COST, Grade } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: videos, error } = await supabase
      .from('videos')
      .select('*, uploader:profiles(id, username, full_name, avatar_url, grade)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 로그인한 경우 시청 여부 체크
    let viewedVideoIds: Set<string> = new Set()
    if (user && videos && videos.length > 0) {
      const ids = videos.map((v: any) => v.id)
      const { data: views } = await supabase
        .from('video_views')
        .select('video_id')
        .eq('viewer_id', user.id)
        .in('video_id', ids)
      if (views) {
        views.forEach((v: any) => viewedVideoIds.add(v.video_id))
      }
    }

    const result = (videos || []).map((v: any) => ({
      ...v,
      has_viewed: viewedVideoIds.has(v.id),
    }))

    return NextResponse.json({ videos: result })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 사용자 등급 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, video_url, thumbnail_url, view_cost, uploader_reward } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 })
    }
    if (!video_url?.trim()) {
      return NextResponse.json({ error: '동영상 URL을 입력해주세요' }, { status: 400 })
    }

    // 등급별 포인트 설정 한도 체크
    const grade = profile.grade as Grade
    const maxCost = GRADE_VIDEO_MAX_COST[grade] ?? 0
    const finalCost = Math.max(0, Math.min(Number(view_cost) || 0, maxCost))
    const finalReward = finalCost > 0 ? Math.max(0, Math.min(Number(uploader_reward) || finalCost, finalCost)) : 0

    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        video_url: video_url.trim(),
        thumbnail_url: thumbnail_url?.trim() || null,
        uploader_id: user.id,
        view_cost: finalCost,
        uploader_reward: finalReward,
        is_published: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ video }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
