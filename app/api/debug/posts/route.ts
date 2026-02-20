import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const slug = searchParams.get('slug')

  const supabase = createAdminClient()

  // slug로 검색
  if (slug) {
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, slug, is_published, created_at')
      .eq('slug', slug)
      .single()

    return NextResponse.json({
      searched_slug: slug,
      found: !!post,
      post: post || null
    })
  }

  // 최근 게시글 5개
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ recent_posts: posts })
}
