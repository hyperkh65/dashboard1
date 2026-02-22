/**
 * SNS 플랫폼 설정 및 OAuth 헬퍼
 */

export type Platform = 'twitter' | 'threads' | 'facebook' | 'instagram'

export type PostOptions = {
  content: string
  mediaUrls?: string[]
  comment?: string // 플랫폼별 첫 댓글
}

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
  options: PostOptions,
): Promise<{ id: string }> {
  // TODO: Twitter API v2는 이미지 업로드가 복잡합니다 (media upload v1 사용 필요)
  // 현재는 텍스트만 지원
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: options.content.substring(0, 280) }),
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
  options: PostOptions,
): Promise<{ id: string }> {
  // Step 1: 컨테이너 생성
  const hasImages = options.mediaUrls && options.mediaUrls.length > 0
  const createBody: Record<string, unknown> = {
    media_type: hasImages ? 'IMAGE' : 'TEXT',
    text: options.content.substring(0, 500),
    access_token: accessToken,
  }
  if (hasImages && options.mediaUrls) {
    createBody.image_url = options.mediaUrls[0] // Threads는 단일 이미지
  }

  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
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
  const { id: postId } = await publishRes.json()

  // Step 3: 댓글 달기 (옵션)
  if (options.comment && options.comment.trim()) {
    try {
      await postThreadsComment(accessToken, userId, postId, options.comment)
    } catch (err) {
      console.error('[Threads] 댓글 달기 실패:', err)
    }
  }

  return { id: postId }
}

async function postThreadsComment(
  accessToken: string,
  userId: string,
  postId: string,
  comment: string,
): Promise<void> {
  // Threads 댓글 API (reply)
  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: comment.substring(0, 500),
        reply_to_id: postId,
        access_token: accessToken,
      }),
    },
  )
  if (!createRes.ok) throw new Error('Threads 댓글 컨테이너 생성 실패')
  const { id: containerId } = await createRes.json()

  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    },
  )
  if (!publishRes.ok) throw new Error('Threads 댓글 게시 실패')
}

export async function postToFacebook(
  accessToken: string,
  options: PostOptions,
): Promise<{ id: string }> {
  // 먼저 관리 중인 페이지 가져오기
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
  )
  if (!pagesRes.ok) throw new Error('Facebook 페이지 목록 조회 실패')
  const { data: pages } = await pagesRes.json()

  const hasImages = options.mediaUrls && options.mediaUrls.length > 0
  let postId: string

  if (!pages || pages.length === 0) {
    // 페이지가 없으면 개인 타임라인에 게시
    const body: Record<string, unknown> = { message: options.content, access_token: accessToken }
    if (hasImages && options.mediaUrls) {
      body.url = options.mediaUrls[0] // 단일 이미지 URL
    }
    const res = await fetch(
      hasImages ? `https://graph.facebook.com/v18.0/me/photos` : `https://graph.facebook.com/v18.0/me/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) throw new Error(`Facebook 포스팅 실패: ${await res.text()}`)
    const { id } = await res.json()
    postId = id
  } else {
    // 첫 번째 페이지에 게시
    const page = pages[0]
    const body: Record<string, unknown> = { message: options.content, access_token: page.access_token }
    if (hasImages && options.mediaUrls) {
      body.url = options.mediaUrls[0]
    }
    const res = await fetch(
      hasImages
        ? `https://graph.facebook.com/v18.0/${page.id}/photos`
        : `https://graph.facebook.com/v18.0/${page.id}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) throw new Error(`Facebook 페이지 포스팅 실패: ${await res.text()}`)
    const { id } = await res.json()
    postId = id
  }

  // 댓글 달기 (옵션)
  if (options.comment && options.comment.trim()) {
    try {
      await postFacebookComment(accessToken, postId, options.comment)
    } catch (err) {
      console.error('[Facebook] 댓글 달기 실패:', err)
    }
  }

  return { id: postId }
}

async function postFacebookComment(
  accessToken: string,
  postId: string,
  comment: string,
): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${postId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: comment, access_token: accessToken }),
    },
  )
  if (!res.ok) throw new Error('Facebook 댓글 달기 실패')
}

export async function postToInstagram(
  accessToken: string,
  userId: string,
  options: PostOptions,
): Promise<{ id: string }> {
  // Instagram은 이미지 필수
  if (!options.mediaUrls || options.mediaUrls.length === 0) {
    throw new Error('Instagram은 이미지가 필수입니다')
  }

  // Instagram Graph API로 미디어 컨테이너 생성
  const createRes = await fetch(
    `https://graph.instagram.com/${userId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: options.content.substring(0, 2200),
        image_url: options.mediaUrls![0], // 위에서 이미 체크함
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
  options: PostOptions,
): Promise<{ id: string }> {
  switch (platform) {
    case 'twitter':
      return postToTwitter(accessToken, options)
    case 'threads':
      return postToThreads(accessToken, platformUserId, options)
    case 'facebook':
      return postToFacebook(accessToken, options)
    case 'instagram':
      return postToInstagram(accessToken, platformUserId, options)
  }
}
