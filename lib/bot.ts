/**
 * 자동 포스팅 봇 유틸리티
 * AI 관련 콘텐츠를 자동으로 생성하고 게시합니다
 */

import { createAdminClient } from './supabase/server'
import { syncPostToNotion } from './notion'
import { sendNewsletterForPost } from './email'

// 슬러그 생성 (한글 지원)
export function generateSlug(title: string): string {
  const timestamp = Date.now()
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
  return `${cleaned}-${timestamp}`
}

// 봇이 게시글 자동 생성
export async function botCreatePost(data: {
  title: string
  content: string
  excerpt?: string
  category_slug?: string
  tags?: string[]
  cover_image?: string
  source_url?: string
  is_members_only?: boolean
}): Promise<{ success: boolean; post_id?: string; error?: string }> {
  const supabase = createAdminClient()

  try {
    // 카테고리 조회
    let categoryId: string | null = null
    if (data.category_slug) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', data.category_slug)
        .single()
      categoryId = category?.id || null
    }

    const slug = generateSlug(data.title)

    // 게시글 생성
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title: data.title,
        slug,
        content: data.content,
        excerpt: data.excerpt || data.content.substring(0, 200),
        cover_image: data.cover_image || null,
        category_id: categoryId,
        is_published: true,
        is_members_only: data.is_members_only || false,
        tags: data.tags || [],
        source_url: data.source_url || null,
        is_bot_generated: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Notion 백업
    let notionPageId: string | null = null
    try {
      notionPageId = await syncPostToNotion(post)
      if (notionPageId) {
        await supabase
          .from('posts')
          .update({ notion_page_id: notionPageId })
          .eq('id', post.id)

        // 동기화 로그
        await supabase.from('notion_sync_logs').insert({
          post_id: post.id,
          notion_page_id: notionPageId,
          sync_type: 'create',
          status: 'success',
        })
      }
    } catch (notionError) {
      console.error('Notion 백업 실패:', notionError)
      await supabase.from('notion_sync_logs').insert({
        post_id: post.id,
        sync_type: 'create',
        status: 'failed',
        error_message: String(notionError),
      })
    }

    // 봇 작업 로그
    await supabase.from('bot_jobs').insert({
      job_type: 'create_post',
      status: 'success',
      payload: { title: data.title, category_slug: data.category_slug },
      result: { post_id: post.id, notion_page_id: notionPageId },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })

    // 뉴스레터 자동 발송 (멤버 전용 제외)
    if (!data.is_members_only) {
      sendNewsletterForPost({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        cover_image: post.cover_image,
      }).catch((e) => console.error('뉴스레터 발송 실패:', e))
    }

    return { success: true, post_id: post.id }
  } catch (error) {
    console.error('봇 게시글 생성 오류:', error)

    await supabase.from('bot_jobs').insert({
      job_type: 'create_post',
      status: 'failed',
      payload: { title: data.title },
      error_message: String(error),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })

    return { success: false, error: String(error) }
  }
}

// API 키 검증
export function validateBotApiKey(key: string): boolean {
  return key === process.env.BOT_API_SECRET
}

// 샘플 AI 뉴스 콘텐츠 (봇 테스트용)
export const SAMPLE_AI_TOPICS = [
  {
    title: 'GPT-5 최신 업데이트: 멀티모달 기능 강화',
    category_slug: 'ai-news',
    tags: ['GPT-5', 'OpenAI', '멀티모달'],
  },
  {
    title: '2025년 주목해야 할 AI 도구 10선',
    category_slug: 'ai-tools',
    tags: ['AI도구', '생산성', '추천'],
  },
  {
    title: '효과적인 프롬프트 엔지니어링 기법 총정리',
    category_slug: 'prompt-engineering',
    tags: ['프롬프트', 'ChatGPT', '활용법'],
  },
]
