import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 관리자 계정 자동 설정 API
 * 서버 시작 후 한번만 실행하면 됩니다.
 * GET /api/admin/setup
 */
export async function GET() {
  const adminEmail = '2days.kr@gmail.com'
  const adminPassword = 'aa050677##'

  try {
    const supabase = createAdminClient()

    // 1. 이미 존재하는 유저 확인
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === adminEmail)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // 2. 새 관리자 계정 생성
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: '관리자',
          username: 'admin',
        },
      })

      if (createError) {
        return NextResponse.json({ error: '계정 생성 실패: ' + createError.message }, { status: 500 })
      }

      userId = newUser.user.id
    }

    // 3. profiles 테이블에 admin 권한 설정
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: '관리자',
        username: 'admin',
        is_admin: true,
        grade: 'staff',
        cafe_joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      // 업서트 실패 시 업데이트 시도
      await supabase
        .from('profiles')
        .update({ is_admin: true, grade: 'staff' })
        .eq('id', userId)
    }

    return NextResponse.json({
      success: true,
      message: `관리자 계정이 설정되었습니다. (${adminEmail})`,
      userId,
      isNewUser: !existingUser,
    })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류: ' + String(err) }, { status: 500 })
  }
}
