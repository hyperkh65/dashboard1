import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Platform, PLATFORMS } from '@/lib/sns/platforms'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${siteUrl}/sns?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/sns?error=invalid_response`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`)
  }

  const admin = createAdminClient()

  // State 검증
  const { data: oauthState, error: stateErr } = await admin
    .from('sns_oauth_state')
    .select('*')
    .eq('state', state)
    .eq('user_id', user.id)
    .eq('platform', platform)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (stateErr || !oauthState) {
    return NextResponse.redirect(`${siteUrl}/sns?error=state_mismatch`)
  }

  // 사용된 state 삭제
  await admin.from('sns_oauth_state').delete().eq('id', oauthState.id)

  const config = PLATFORMS[platform as Platform]
  const redirectUri = `${siteUrl}/api/sns/callback/${platform}`

  try {
    let accessToken: string
    let refreshToken: string | null = null
    let expiresIn: number | null = null
    let platformUserId: string
    let platformUsername: string
    let platformDisplayName: string
    let platformAvatar: string | null = null

    // ---- 플랫폼별 토큰 교환 ----
    switch (platform) {
      case 'twitter': {
        const creds = Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')

        const tokenRes = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${creds}`,
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: process.env.TWITTER_CLIENT_ID!,
            redirect_uri: redirectUri,
            code_verifier: oauthState.code_verifier!,
          }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok) throw new Error(JSON.stringify(tokenData))
        accessToken = tokenData.access_token
        refreshToken = tokenData.refresh_token || null
        expiresIn = tokenData.expires_in || null

        // 사용자 정보 조회
        const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const userData = await userRes.json()
        platformUserId = userData.data.id
        platformUsername = `@${userData.data.username}`
        platformDisplayName = userData.data.name
        platformAvatar = userData.data.profile_image_url || null
        break
      }

      case 'threads': {
        const tokenRes = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.THREADS_APP_ID!,
            client_secret: process.env.THREADS_APP_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok) throw new Error(JSON.stringify(tokenData))
        const shortToken = tokenData.access_token
        const tempUserId = String(tokenData.user_id)

        // 장기 토큰으로 교환
        const ltRes = await fetch(
          `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${process.env.THREADS_APP_SECRET}&access_token=${shortToken}`
        )
        const ltData = await ltRes.json()
        accessToken = ltData.access_token || shortToken
        expiresIn = ltData.expires_in || null

        // 사용자 정보 가져오기 (Threads는 /me 엔드포인트 사용)
        const userRes = await fetch(
          `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`
        )
        const userData = await userRes.json()

        // 🔍 디버깅: Threads API 응답 로깅
        console.log('[Threads API Response]:', JSON.stringify(userData, null, 2))

        // 에러 처리 추가
        if (!userRes.ok || userData.error) {
          console.error('[Threads Callback] 사용자 정보 조회 실패:', userData)
          throw new Error(`Threads 사용자 정보 조회 실패: ${JSON.stringify(userData)}`)
        }

        if (!userData.id || !userData.username) {
          console.error('[Threads Callback] 사용자 정보가 불완전:', userData)
          throw new Error(`Threads 사용자 정보가 불완전합니다: ${JSON.stringify(userData)}`)
        }

        console.log('[Threads Callback] 사용자 정보 조회 성공:', { id: userData.id, username: userData.username })

        // ✅ userData.id를 platformUserId로 사용 (이게 실제 Threads User ID!)
        platformUserId = userData.id
        platformUsername = `@${userData.username}`
        platformDisplayName = userData.name || userData.username
        platformAvatar = userData.threads_profile_picture_url || null
        break
      }

      case 'facebook': {
        const tokenRes = await fetch(
          `${config.tokenUrl}?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
        )
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok || tokenData.error) throw new Error(JSON.stringify(tokenData))
        accessToken = tokenData.access_token
        expiresIn = tokenData.expires_in || null

        // 사용자 정보
        const userRes = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`
        )
        const userData = await userRes.json()
        platformUserId = userData.id
        platformUsername = userData.name
        platformDisplayName = userData.name
        platformAvatar = userData.picture?.data?.url || null
        break
      }

      case 'instagram': {
        // Instagram Graph API로 토큰 교환
        const formData = new URLSearchParams({
          client_id: process.env.INSTAGRAM_CLIENT_ID!,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        })

        const tokenRes = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok || tokenData.error) throw new Error(JSON.stringify(tokenData))

        const shortToken = tokenData.access_token
        platformUserId = String(tokenData.user_id)

        // 장기 토큰으로 교환
        const ltRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortToken}`
        )
        const ltData = await ltRes.json()
        accessToken = ltData.access_token || shortToken
        expiresIn = ltData.expires_in || null

        // 사용자 정보
        const userRes = await fetch(
          `https://graph.instagram.com/${platformUserId}?fields=id,username,account_type&access_token=${accessToken}`
        )
        const userData = await userRes.json()
        platformUsername = `@${userData.username}`
        platformDisplayName = userData.username
        platformAvatar = null
        break
      }

      default:
        return NextResponse.redirect(`${siteUrl}/sns?error=unsupported_platform`)
    }

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    // DB에 연결 정보 저장 (upsert)
    const { data: upsertData, error: upsertError } = await admin.from('sns_connections').upsert({
      user_id: user.id,
      platform,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      platform_user_id: platformUserId,
      platform_username: platformUsername,
      platform_display_name: platformDisplayName,
      platform_avatar: platformAvatar,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    if (upsertError) {
      console.error(`[SNS Callback] DB upsert 실패:`, upsertError)
      return NextResponse.redirect(`${siteUrl}/sns?error=${encodeURIComponent(`DB 저장 실패: ${upsertError.message}`)}`)
    }

    console.log(`[SNS Callback] ${platform} 연결 성공:`, { user_id: user.id, platform })
    return NextResponse.redirect(`${siteUrl}/sns?connected=${platform}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[SNS Callback] ${platform} 오류:`, message)
    return NextResponse.redirect(`${siteUrl}/sns?error=${encodeURIComponent(message)}`)
  }
}
