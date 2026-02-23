import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/sns/upload
 * SNS 포스팅용 이미지 업로드
 * - Supabase Storage에 저장
 * - 최대 10MB
 * - 허용 포맷: jpg, jpeg, png, gif, webp
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 파일 크기 제한 (10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // 파일명 생성 (중복 방지)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const ext = file.name.split('.').pop()
    const fileName = `${user.id}/${timestamp}-${random}.${ext}`

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('sns-media')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('[Upload] Supabase Storage error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('sns-media')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: data.path,
    })
  } catch (err: unknown) {
    const error = err as Error
    console.error('[Upload] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/sns/upload
 * 업로드된 이미지 삭제
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileName } = await req.json()
    if (!fileName) {
      return NextResponse.json({ error: 'No fileName provided' }, { status: 400 })
    }

    // 본인 파일인지 확인
    if (!fileName.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase.storage
      .from('sns-media')
      .remove([fileName])

    if (error) {
      console.error('[Upload Delete] Error:', error)
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    console.error('[Upload Delete] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
