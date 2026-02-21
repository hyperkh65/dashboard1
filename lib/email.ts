import { Resend } from 'resend'
import { createAdminClient } from './supabase/server'

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@email.2days.kr'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://club.2days.kr'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'AI 인사이트 카페'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/** 뉴스레터 구독 확인 메일 */
export async function sendWelcomeEmail(email: string, name?: string) {
  const resend = getResend()
  await resend.emails.send({
    from: `${SITE_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: `${SITE_NAME} 뉴스레터 구독을 환영합니다!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background:#f9fafb; margin:0; padding:40px 0;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:22px;">🎉 구독 완료!</h1>
      <p style="color:rgba(255,255,255,.85); margin:8px 0 0; font-size:15px;">${SITE_NAME}</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px; color:#111827; margin:0 0 16px;">안녕하세요${name ? ` ${name}님` : ''}!</p>
      <p style="color:#6b7280; line-height:1.7; margin:0 0 24px;">
        <strong>${SITE_NAME}</strong> 뉴스레터 구독을 완료했습니다.<br>
        새로운 AI 인사이트가 발행될 때마다 메일로 알려드릴게요.
      </p>
      <a href="${SITE_URL}/posts"
        style="display:inline-block; background:#6366f1; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
        최신 글 보러 가기 →
      </a>
    </div>
    <div style="background:#f9fafb; padding:20px 32px; border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">
        더 이상 받지 않으려면
        <a href="${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:#6366f1;">구독 취소</a>
        하세요.
      </p>
    </div>
  </div>
</body>
</html>`,
  })
}

/** 새 글 발행 시 뉴스레터 발송 */
export async function sendNewsletterForPost(post: {
  title: string
  slug: string
  excerpt?: string
  cover_image?: string
}) {
  const resend = getResend()
  const supabase = createAdminClient()

  // 활성 구독자 전체 조회
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email, name, unsubscribe_token')
    .eq('is_active', true)

  if (!subscribers || subscribers.length === 0) return { sent: 0 }

  const postUrl = `${SITE_URL}/posts/${post.slug}`

  // Resend batch (최대 100명씩)
  const BATCH = 100
  let sent = 0

  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH)

    await resend.batch.send(
      batch.map((sub) => ({
        from: `${SITE_NAME} <${FROM_EMAIL}>`,
        to: sub.email,
        subject: `📌 새 글: ${post.title}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background:#f9fafb; margin:0; padding:40px 0;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:28px 32px;">
      <p style="color:rgba(255,255,255,.8); font-size:12px; margin:0 0 4px; text-transform:uppercase; letter-spacing:.05em;">AI 인사이트 카페 · 새 글</p>
      <h1 style="color:#fff; margin:0; font-size:20px; line-height:1.4;">${post.title}</h1>
    </div>
    ${post.cover_image ? `<img src="${post.cover_image}" style="width:100%; height:200px; object-fit:cover;" />` : ''}
    <div style="padding:28px 32px;">
      ${post.excerpt ? `<p style="color:#4b5563; line-height:1.7; margin:0 0 24px; font-size:15px;">${post.excerpt}</p>` : ''}
      <a href="${postUrl}"
        style="display:inline-block; background:#6366f1; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
        전체 글 읽기 →
      </a>
    </div>
    <div style="background:#f9fafb; padding:16px 32px; border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">
        ${SITE_NAME} ·
        <a href="${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}" style="color:#6366f1;">구독 취소</a>
      </p>
    </div>
  </div>
</body>
</html>`,
      }))
    )

    sent += batch.length
  }

  return { sent }
}
