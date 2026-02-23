import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/sns/upload
 * SNS 포스팅용 미디어 업로드 (이미지/동영상)
 * - Supabase Storage에 저장
 * - 최대 100MB
 * - 허용 포맷: 모든 일반적인 이미지/동영상 형식 (jpg, png, gif, webp, mp4, mov, avi, mkv, webm, wmv, flv 등)
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

    // 파일 크기 제한 (100MB - 동영상 지원)
    const MAX_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      console.error(`[Upload] File too large: ${sizeMB}MB, filename: ${file.name}`)
      return NextResponse.json({
        error: `파일이 너무 큽니다 (${sizeMB}MB). 최대 100MB까지 업로드 가능합니다.`
      }, { status: 400 })
    }

    // 파일 확장자 검증 (MIME 타입이 정확하지 않을 수 있음)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const allowedImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
    const allowedVideoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp', 'flv', 'wmv', 'mpg', 'mpeg', 'ogv']
    const isValidExt = [...allowedImageExts, ...allowedVideoExts].includes(ext)

    // 파일 타입 검증 (이미지 + 모든 동영상 형식)
    const allowedTypes = [
      // 이미지
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      // 동영상 - 일반
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      'video/webm', 'video/x-m4v', 'video/3gpp', 'video/3gpp2',
      // 동영상 - 추가 포맷
      'video/x-flv', 'video/x-ms-wmv', 'video/ogg', 'video/mp2t',
      // 모바일/기타
      'application/octet-stream', // 일부 동영상 편집 도구는 이 MIME 타입 사용
    ]

    // MIME 타입 또는 확장자가 유효하면 통과
    if (!allowedTypes.includes(file.type) && !isValidExt) {
      console.error(`[Upload] Rejected - Type: ${file.type}, Ext: ${ext}, Filename: ${file.name}, Size: ${file.size} bytes`)
      return NextResponse.json({
        error: `지원하지 않는 파일 형식입니다.\nMIME: ${file.type}\n확장자: .${ext}\n파일명: ${file.name}`
      }, { status: 400 })
    }

    console.log(`[Upload] Accepted - Type: ${file.type}, Ext: ${ext}, Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`)

    // 파일명 생성 (중복 방지)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
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
