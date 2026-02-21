import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP, MP4, WEBM 지원)' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 50MB를 초과할 수 없습니다' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('community-media')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: '업로드 실패: ' + error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('community-media')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
