/**
 * SNS 플랫폼 설정 및 OAuth 헬퍼
 */

export type Platform = 'twitter' | 'threads' | 'facebook' | 'instagram'

export type PostOptions = {
  content: string
  mediaUrls?: string[] // 이미지 또는 동영상 URL
  comment?: string // 플랫폼별 첫 댓글
  commentMediaUrls?: string[] // 댓글에 첨부할 미디어 URL
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

// 미디어 타입 감지 (URL 기반)
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
  const lowerUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowerUrl.includes(ext))
}

// Facebook 에러 응답 타입
interface FacebookError {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    is_transient?: boolean
  }
}

// Facebook 일시적 에러 확인
function isFacebookTransientError(errorText: string): boolean {
  try {
    const parsed: FacebookError = JSON.parse(errorText)
    return parsed.error?.is_transient === true
  } catch {
    return false
  }
}

// 지수 백오프를 사용한 재시도 함수
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 2000,
): Promise<T> {
  let lastError: Error
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // 마지막 시도였다면 에러를 던짐
      if (attempt === maxRetries) {
        break
      }

      // Facebook 일시적 에러인 경우에만 재시도
      if (!isFacebookTransientError(lastError.message)) {
        throw lastError
      }

      // 지수 백오프로 대기
      const delayMs = initialDelayMs * Math.pow(2, attempt)
      console.log(`[Facebook] 일시적 에러 발생, ${delayMs}ms 후 재시도 (${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  throw lastError!
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

async function waitForThreadsContainer(containerId: string, accessToken: string): Promise<void> {
  const maxAttempts = 10
  const delayMs = 3000
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    const res = await fetch(
      `https://graph.threads.net/v1.0/${containerId}?fields=status,error_message&access_token=${accessToken}`,
    )
    if (!res.ok) continue
    const data = await res.json()
    if (data.status === 'FINISHED') return
    if (data.status === 'ERROR') throw new Error(`Threads 컨테이너 오류: ${data.error_message}`)
  }
  throw new Error('Threads 컨테이너 준비 시간 초과')
}

export async function postToThreads(
  accessToken: string,
  userId: string,
  options: PostOptions,
): Promise<{ id: string }> {
  // Step 1: 컨테이너 생성
  const hasMedia = options.mediaUrls && options.mediaUrls.length > 0
  const isVideo = hasMedia && isVideoUrl(options.mediaUrls![0])
  const createBody: Record<string, unknown> = {
    media_type: isVideo ? 'VIDEO' : hasMedia ? 'IMAGE' : 'TEXT',
    text: options.content.substring(0, 500),
    access_token: accessToken,
  }
  if (hasMedia) {
    if (isVideo) {
      createBody.video_url = options.mediaUrls![0]
    } else {
      createBody.image_url = options.mediaUrls![0]
    }
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
    const errorText = await createRes.text()
    console.error('[Threads API Error] User ID:', userId)
    console.error('[Threads API Error] Request:', createBody)
    console.error('[Threads API Error] Response:', errorText)
    throw new Error(`Threads 컨테이너 생성 실패: ${errorText}`)
  }
  const { id: containerId } = await createRes.json()

  // Step 2: 컨테이너 상태가 FINISHED될 때까지 대기
  await waitForThreadsContainer(containerId, accessToken)

  // Step 3: 게시
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    },
  )
  if (!publishRes.ok) {
    const errorText = await publishRes.text()
    console.error('[Threads Publish Error] Container ID:', containerId)
    console.error('[Threads Publish Error] User ID:', userId)
    console.error('[Threads Publish Error] Response:', errorText)
    throw new Error(`Threads 게시 실패: ${errorText}`)
  }
  const { id: postId } = await publishRes.json()

  // Step 3: 댓글 달기 (옵션)
  if (options.comment && options.comment.trim()) {
    try {
      await postThreadsComment(accessToken, userId, postId, options.comment, options.commentMediaUrls)
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
  mediaUrls?: string[],
): Promise<void> {
  // Threads 댓글 API (reply)
  const hasMedia = mediaUrls && mediaUrls.length > 0
  const isVideo = hasMedia && isVideoUrl(mediaUrls![0])
  const requestBody: Record<string, unknown> = {
    media_type: isVideo ? 'VIDEO' : hasMedia ? 'IMAGE' : 'TEXT',
    text: comment.substring(0, 500),
    reply_to_id: postId,
    access_token: accessToken,
  }
  if (hasMedia) {
    if (isVideo) {
      requestBody.video_url = mediaUrls![0]
    } else {
      requestBody.image_url = mediaUrls![0]
    }
  }
  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    },
  )
  if (!createRes.ok) throw new Error('Threads 댓글 컨테이너 생성 실패')
  const { id: containerId } = await createRes.json()

  await waitForThreadsContainer(containerId, accessToken)

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

  const hasMedia = options.mediaUrls && options.mediaUrls.length > 0
  const isVideo = hasMedia && isVideoUrl(options.mediaUrls![0])
  let postId: string

  if (!pages || pages.length === 0) {
    // 페이지가 없으면 개인 타임라인에 게시
    const body: Record<string, unknown> = { message: options.content, access_token: accessToken }
    if (hasMedia) {
      body.url = options.mediaUrls![0]
    }
    const endpoint = isVideo
      ? `https://graph.facebook.com/v18.0/me/videos`
      : hasMedia
      ? `https://graph.facebook.com/v18.0/me/photos`
      : `https://graph.facebook.com/v18.0/me/feed`

    // 비디오 업로드는 재시도 로직 적용
    const uploadFn = async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Facebook 포스팅 실패: ${await res.text()}`)
      return res.json()
    }

    const result = isVideo ? await retryWithBackoff(uploadFn) : await uploadFn()
    postId = result.id
  } else {
    // 첫 번째 페이지에 게시
    const page = pages[0]
    const body: Record<string, unknown> = { message: options.content, access_token: page.access_token }
    if (hasMedia) {
      body.url = options.mediaUrls![0]
    }
    const endpoint = isVideo
      ? `https://graph.facebook.com/v18.0/${page.id}/videos`
      : hasMedia
      ? `https://graph.facebook.com/v18.0/${page.id}/photos`
      : `https://graph.facebook.com/v18.0/${page.id}/feed`

    // 비디오 업로드는 재시도 로직 적용
    const uploadFn = async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Facebook 페이지 포스팅 실패: ${await res.text()}`)
      return res.json()
    }

    const result = isVideo ? await retryWithBackoff(uploadFn) : await uploadFn()
    postId = result.id
  }

  // 댓글 달기 (옵션)
  if (options.comment && options.comment.trim()) {
    try {
      await postFacebookComment(accessToken, postId, options.comment, options.commentMediaUrls)
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
  mediaUrls?: string[],
): Promise<void> {
  const body: Record<string, unknown> = { message: comment, access_token: accessToken }
  if (mediaUrls && mediaUrls.length > 0) {
    body.attachment_url = mediaUrls![0] // Facebook 댓글은 단일 미디어 첨부
  }
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${postId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error('Facebook 댓글 달기 실패')
}

export async function postToInstagram(
  accessToken: string,
  userId: string,
  options: PostOptions,
): Promise<{ id: string }> {
  // Instagram은 미디어 필수
  if (!options.mediaUrls || options.mediaUrls.length === 0) {
    throw new Error('Instagram은 이미지 또는 동영상이 필수입니다')
  }

  const isVideo = isVideoUrl(options.mediaUrls![0])
  // Instagram Graph API로 미디어 컨테이너 생성
  const createBody: Record<string, unknown> = {
    caption: options.content.substring(0, 2200),
    access_token: accessToken,
  }
  if (isVideo) {
    createBody.media_type = 'REELS'
    createBody.video_url = options.mediaUrls![0]
  } else {
    createBody.image_url = options.mediaUrls![0]
  }
  const createRes = await fetch(
    `https://graph.instagram.com/${userId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
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
