import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { encryptPassword, decryptPassword } from '@/lib/blog/crypto'

// GET: 계정 목록
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('blog_accounts')
    .select('id, platform, naver_id, blog_id, blog_name, is_active, last_login_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

// POST: 계정 추가 (로그인 검증 포함)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { naver_id, naver_pw, blog_id, blog_name } = await req.json()
  if (!naver_id || !naver_pw) {
    return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요' }, { status: 400 })
  }

  const encryptedPw = encryptPassword(naver_pw)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('blog_accounts')
    .upsert(
      {
        user_id: user.id,
        platform: 'naver',
        naver_id: naver_id.trim(),
        naver_pw_enc: encryptedPw,
        blog_id: blog_id?.trim() || naver_id.trim(),
        blog_name: blog_name?.trim() || `${naver_id}의 블로그`,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform,naver_id' },
    )
    .select('id, naver_id, blog_id, blog_name')
    .single()

  if (error) {
    console.error('[Blog Account] 저장 실패:', error)
    return NextResponse.json({ error: '계정 저장 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, account: data })
}
