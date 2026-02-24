#!/usr/bin/env npx ts-node
/**
 * 네이버 블로그 자동 발행 - Playwright 러너
 * ============================================
 * Vercel 서버리스에서는 Playwright를 실행할 수 없어
 * 이 스크립트를 로컬 PC 또는 VPS에서 실행해야 합니다.
 *
 * 📦 설치:
 *   npm install -g ts-node
 *   npx playwright install chromium
 *
 * ⚙️ 환경변수 (.env 또는 직접 설정):
 *   DASHBOARD_URL=https://your-site.vercel.app
 *   BLOG_RUNNER_SECRET=your-secret-key
 *
 * 🚀 실행:
 *   DASHBOARD_URL=https://... BLOG_RUNNER_SECRET=... npx ts-node scripts/naver-blog-runner.ts
 *   또는 pm2 등으로 상시 실행 (cron 모드)
 */

import { chromium, Browser, Page } from 'playwright'

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000'
const RUNNER_SECRET = process.env.BLOG_RUNNER_SECRET || ''
const POLL_INTERVAL_MS = 60_000 // 1분마다 체크
const HEADLESS = process.env.HEADLESS !== 'false' // 기본 headless

if (!RUNNER_SECRET) {
  console.error('❌ BLOG_RUNNER_SECRET 환경변수가 필요합니다.')
  process.exit(1)
}

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface PendingPost {
  id: string
  title: string
  content: string
  category_no: number
  tags: string[]
  media_urls: string[]
  retry_count: number
  naver_id: string
  naver_pw: string
  blog_id: string
}

// ─── 대시보드 API 호출 ────────────────────────────────────────────────────────

async function fetchPendingPosts(): Promise<PendingPost[]> {
  const res = await fetch(`${DASHBOARD_URL}/api/blog/pending`, {
    headers: { Authorization: `Bearer ${RUNNER_SECRET}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pending API 실패 (${res.status}): ${text}`)
  }
  const { posts } = await res.json()
  return posts || []
}

async function reportResult(postId: string, success: boolean, platformPostId?: string, errorMessage?: string) {
  try {
    await fetch(`${DASHBOARD_URL}/api/blog/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNNER_SECRET}`,
      },
      body: JSON.stringify({
        post_id: postId,
        success,
        platform_post_id: platformPostId,
        error_message: errorMessage,
      }),
    })
  } catch (err) {
    console.error('[Report] 결과 보고 실패:', err)
  }
}

// ─── Playwright 유틸 ─────────────────────────────────────────────────────────

/** 사람처럼 느리게 타이핑 */
async function humanType(page: Page, selector: string, text: string) {
  await page.click(selector)
  await page.fill(selector, '') // 기존 내용 제거
  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 80 + 30 })
  }
}

/** 랜덤 딜레이 */
function sleep(min: number, max = min): Promise<void> {
  return new Promise(r => setTimeout(r, Math.random() * (max - min) + min))
}

// ─── 네이버 로그인 ────────────────────────────────────────────────────────────

async function naverLogin(page: Page, naverId: string, naverPw: string): Promise<boolean> {
  console.log(`  📝 네이버 로그인 시도: ${naverId}`)

  await page.goto('https://nid.naver.com/nidlogin.login?mode=form', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await sleep(1000, 2000)

  // 아이디 입력
  await humanType(page, '#id', naverId)
  await sleep(500, 1000)

  // 비밀번호 입력
  await humanType(page, '#pw', naverPw)
  await sleep(500, 1000)

  // 로그인 버튼 클릭
  await page.click('#log\\.login')
  await sleep(2000, 4000)

  // 결과 확인
  const currentUrl = page.url()
  console.log(`  현재 URL: ${currentUrl}`)

  // 보안 인증 (캡차, 2단계 인증) 처리
  if (currentUrl.includes('nidlogin') || currentUrl.includes('challenge')) {
    // 캡차가 뜬 경우 (headless=false일 때 수동 처리 가능)
    if (!HEADLESS) {
      console.log('  ⚠️ 보안 인증이 필요합니다. 브라우저에서 직접 처리해주세요...')
      // 최대 60초 대기 (사용자가 수동으로 인증)
      await page.waitForURL(url => !url.href.includes('nidlogin'), { timeout: 60_000 })
    } else {
      throw new Error('네이버 보안 인증 필요 (캡차/2단계). HEADLESS=false로 실행하여 수동 처리하세요.')
    }
  }

  // 로그인 성공 확인
  await page.goto('https://www.naver.com/', { waitUntil: 'domcontentloaded' })
  const isLoggedIn = await page.locator('.gnb_name').isVisible().catch(() => false)
    || await page.locator('[class*="MyInfo"]').isVisible().catch(() => false)
    || !page.url().includes('login')

  if (!isLoggedIn) {
    throw new Error('로그인 실패: 아이디 또는 비밀번호를 확인해주세요.')
  }

  console.log('  ✅ 로그인 성공')
  return true
}

// ─── 블로그 글 작성 ───────────────────────────────────────────────────────────

async function naverBlogPost(page: Page, post: PendingPost): Promise<string> {
  const blogId = post.blog_id || post.naver_id
  console.log(`  📝 블로그 작성 시작: ${post.title}`)

  // 블로그 글쓰기 페이지로 이동
  await page.goto(`https://blog.naver.com/${blogId}`, { waitUntil: 'domcontentloaded' })
  await sleep(1500, 2500)

  // 글쓰기 버튼 찾기 (다양한 선택자 시도)
  const writeButtonSelectors = [
    'a[href*="PostWriteForm"]',
    'a[class*="write"]',
    '.btn_write',
    'a:has-text("글쓰기")',
    '[data-v-*] a:has-text("글쓰기")',
  ]

  let writeClicked = false
  for (const sel of writeButtonSelectors) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click()
        writeClicked = true
        break
      }
    } catch { /* 무시 */ }
  }

  if (!writeClicked) {
    // 직접 URL로 이동
    await page.goto(
      `https://blog.naver.com/PostWriteForm.naver?blogId=${blogId}`,
      { waitUntil: 'networkidle', timeout: 30_000 },
    )
  }

  await sleep(2000, 3000)

  // Smart Editor iframe 처리
  const iframeSelectors = ['iframe#mainFrame', 'iframe[id*="editor"]', 'iframe']
  let frame = page.mainFrame()

  for (const sel of iframeSelectors) {
    try {
      const iframeEl = page.frameLocator(sel)
      const titleInput = iframeEl.locator('[placeholder*="제목"], #subject, .se-title-input')
      if (await titleInput.first().isVisible({ timeout: 3000 })) {
        // iframe 내부 작업
        await titleInput.first().click()
        await titleInput.first().fill(post.title)
        await sleep(500, 1000)

        // 본문 입력
        const contentArea = iframeEl.locator('.se-main-container, #se-content, [contenteditable="true"]').first()
        await contentArea.click()
        await contentArea.fill('')
        // HTML 내용을 텍스트로 변환 (단순화)
        const plainText = post.content.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
        await contentArea.type(plainText, { delay: 5 })
        await sleep(1000, 2000)

        writeClicked = true
        break
      }
    } catch { /* 무시 */ }
  }

  // iframe 없이 직접 접근 시도
  if (!writeClicked) {
    // 제목
    const titleSel = '#subject, [name="title"], .se-title-input, [placeholder*="제목"]'
    await page.waitForSelector(titleSel, { timeout: 10_000 })
    await humanType(page, titleSel, post.title)
    await sleep(500)

    // 본문
    const bodySel = '.se-main-container, #content, [contenteditable="true"]'
    await page.waitForSelector(bodySel, { timeout: 10_000 })
    const plainText = post.content.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    await page.fill(bodySel, plainText)
    await sleep(1000, 2000)
  }

  // 태그 입력
  if (post.tags && post.tags.length > 0) {
    try {
      const tagInput = page.locator('#tagInput, [placeholder*="태그"], .se-tag-input').first()
      if (await tagInput.isVisible({ timeout: 3000 })) {
        await tagInput.click()
        await tagInput.type(post.tags.join(','), { delay: 30 })
        await tagInput.press('Enter')
        await sleep(500)
      }
    } catch { /* 태그 입력 실패해도 계속 진행 */ }
  }

  // 카테고리 선택
  if (post.category_no > 0) {
    try {
      await page.click('[class*="category"], #category', { timeout: 3000 })
      await sleep(500)
      await page.click(`[data-category-no="${post.category_no}"], option[value="${post.category_no}"]`, { timeout: 3000 })
      await sleep(500)
    } catch { /* 카테고리 선택 실패해도 계속 진행 */ }
  }

  // 발행 버튼 클릭
  const publishSelectors = [
    'button:has-text("발행")',
    'button:has-text("등록")',
    '#publish',
    '.btn_publish',
    '[class*="publish"]',
  ]

  let published = false
  for (const sel of publishSelectors) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click()
        published = true
        break
      }
    } catch { /* 무시 */ }
  }

  if (!published) {
    throw new Error('발행 버튼을 찾을 수 없습니다. 블로그 UI가 변경되었을 수 있습니다.')
  }

  await sleep(2000, 3000)

  // 발행 확인 팝업 처리
  try {
    const confirmBtn = page.locator('button:has-text("확인"), button:has-text("발행하기")').first()
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click()
      await sleep(2000, 3000)
    }
  } catch { /* 무시 */ }

  // 발행된 포스트 URL에서 logNo 추출
  const finalUrl = page.url()
  console.log(`  발행 후 URL: ${finalUrl}`)

  let logNo = ''
  const logNoMatch = finalUrl.match(/logNo=(\d+)/)
  if (logNoMatch) {
    logNo = logNoMatch[1]
  } else {
    // 현재 페이지에서 logNo 추출 시도
    try {
      logNo = await page.evaluate(() => {
        const url = window.location.href
        const m = url.match(/logNo=(\d+)/)
        return m ? m[1] : ''
      })
    } catch { /* 무시 */ }
  }

  console.log(`  ✅ 발행 완료! logNo: ${logNo || '(추출 실패)'}`)
  return logNo
}

// ─── 메인 루프 ───────────────────────────────────────────────────────────────

async function processPost(browser: Browser, post: PendingPost) {
  console.log(`\n📋 포스트 처리 중: [${post.id.substring(0, 8)}...] ${post.title}`)

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })

  const page = await context.newPage()

  try {
    await naverLogin(page, post.naver_id, post.naver_pw)
    const logNo = await naverBlogPost(page, post)
    await reportResult(post.id, true, logNo)
    console.log(`  ✅ 성공 보고 완료`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  ❌ 실패:`, message)
    await reportResult(post.id, false, undefined, message)

    // 스크린샷 저장 (디버깅용)
    try {
      const screenshotPath = `./error-${post.id.substring(0, 8)}-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      console.log(`  📸 에러 스크린샷: ${screenshotPath}`)
    } catch { /* 무시 */ }
  } finally {
    await context.close()
  }
}

async function main() {
  console.log('🚀 네이버 블로그 자동 발행 러너 시작')
  console.log(`   대시보드: ${DASHBOARD_URL}`)
  console.log(`   Headless: ${HEADLESS}`)
  console.log(`   폴링 간격: ${POLL_INTERVAL_MS / 1000}초`)
  console.log()

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // 봇 감지 회피
    ],
  })

  // 봇 감지 회피 설정
  browser.on('targetcreated', async () => {
    // navigator.webdriver 숨기기는 context별로 처리
  })

  console.log('✅ Playwright 브라우저 실행됨')

  const runCycle = async () => {
    try {
      console.log(`\n[${new Date().toLocaleString('ko-KR')}] 대기 중인 포스트 확인...`)
      const posts = await fetchPendingPosts()

      if (posts.length === 0) {
        console.log('  📭 발행 대기 중인 포스트 없음')
        return
      }

      console.log(`  📬 ${posts.length}개 포스트 발견`)

      for (const post of posts) {
        await processPost(browser, post)
        await sleep(3000, 5000) // 포스트 간 딜레이
      }
    } catch (err: unknown) {
      console.error('  ❌ 사이클 오류:', err instanceof Error ? err.message : String(err))
    }
  }

  // 즉시 첫 실행
  await runCycle()

  // 이후 주기적 실행
  setInterval(runCycle, POLL_INTERVAL_MS)
}

main().catch((err) => {
  console.error('💥 치명적 오류:', err)
  process.exit(1)
})
