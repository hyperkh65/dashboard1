/**
 * SNS 플랫폼 설정 및 OAuth 헬퍼
 */

export type Platform = 'twitter' | 'threads' | 'facebook' | 'instagram'

export const PLATFORMS: Record<Platform, {
  name: string
  icon: string
  color: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  charLimit: number
}> = {
  twitter: {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#000000',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    charLimit: 280,
  },
  threads: {
    name: 'Threads',
    icon: '@',
    color: '#000000',
    authUrl: 'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    scopes: ['threads_basic', 'threads_content_publish'],
    charLimit: 500,
  },
  facebook: {
    name: 'Facebook',
    icon: 'f',
    color: '#1877F2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['pages_show_list', 'pages_manage_posts'],
    charLimit: 63206,
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['instagram_basic', 'instagram_content_publish'],
    charLimit: 2200,
  },
}

// PKCE 코드 생성 (X용)
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64url')
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hash).toString('base64url')
}

// 무작위 state 생성
export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('hex')
}

// ============================================================
// 플랫폼별 포스팅 함수
// ============================================================

export async function postToTwitter(
  accessToken: string,
  content: string,
): Promise<{ id: string }> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: content.substring(0, 280) }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twitter 포스팅 실패: ${err}`)
  }
  const json = await res.json()
  return { id: json.data.id }
}

export async function postToThreads(
  accessToken: string,
  userId: string,
  content: string,
): Promise<{ id: string }> {
  // Step 1: 컨테이너 생성
  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: content.substring(0, 500),
        access_token: accessToken,
      }),
    },
  )
  if (!createRes.ok) {
    throw new Error(`Threads 컨테이너 생성 실패: ${await createRes.text()}`)
  }
  const { id: containerId } = await createRes.json()

  // Step 2: 게시
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    },
  )
  if (!publishRes.ok) {
    throw new Error(`Threads 게시 실패: ${await publishRes.text()}`)
  }
  const { id } = await publishRes.json()
  return { id }
}

export async function postToFacebook(
  accessToken: string,
  content: string,
): Promise<{ id: string }> {
  // 먼저 관리 중인 페이지 가져오기
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
  )
  if (!pagesRes.ok) throw new Error('Facebook 페이지 목록 조회 실패')
  const { data: pages } = await pagesRes.json()

  if (!pages || pages.length === 0) {
    // 페이지가 없으면 개인 타임라인에 게시
    const res = await fetch(
      `https://graph.facebook.com/v18.0/me/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, access_token: accessToken }),
      },
    )
    if (!res.ok) throw new Error(`Facebook 포스팅 실패: ${await res.text()}`)
    const { id } = await res.json()
    return { id }
  }

  // 첫 번째 페이지에 게시
  const page = pages[0]
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${page.id}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        access_token: page.access_token,
      }),
    },
  )
  if (!res.ok) throw new Error(`Facebook 페이지 포스팅 실패: ${await res.text()}`)
  const { id } = await res.json()
  return { id }
}

export async function postToInstagram(
  accessToken: string,
  userId: string,
  content: string,
  imageUrl?: string,
): Promise<{ id: string }> {
  // Instagram Graph API로 미디어 컨테이너 생성
  const createRes = await fetch(
    `https://graph.instagram.com/${userId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: content.substring(0, 2200),
        image_url: imageUrl,
        access_token: accessToken,
      }),
    },
  )
  if (!createRes.ok) {
    throw new Error(`Instagram 컨테이너 생성 실패: ${await createRes.text()}`)
  }
  const { id: containerId } = await createRes.json()

  // 미디어 게시
  const publishRes = await fetch(
    `https://graph.instagram.com/${userId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    },
  )
  if (!publishRes.ok) {
    throw new Error(`Instagram 게시 실패: ${await publishRes.text()}`)
  }
  const { id } = await publishRes.json()
  return { id }
}

// 플랫폼에 실제 포스팅
export async function postToPlatform(
  platform: Platform,
  accessToken: string,
  platformUserId: string,
  content: string,
): Promise<{ id: string }> {
  switch (platform) {
    case 'twitter':
      return postToTwitter(accessToken, content)
    case 'threads':
      return postToThreads(accessToken, platformUserId, content)
    case 'facebook':
      return postToFacebook(accessToken, content)
    case 'instagram':
      return postToInstagram(accessToken, platformUserId, content)
  }
}
