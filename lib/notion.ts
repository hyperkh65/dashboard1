import { Client } from '@notionhq/client'
import { Post } from '@/types'

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

const DATABASE_ID = process.env.NOTION_DATABASE_ID!

export async function syncPostToNotion(post: Post): Promise<string | null> {
  try {
    const properties: Record<string, unknown> = {
      Title: {
        title: [{ text: { content: post.title } }],
      },
      Slug: {
        rich_text: [{ text: { content: post.slug } }],
      },
      Status: {
        select: { name: post.is_published ? '공개' : '비공개' },
      },
      Tags: {
        multi_select: post.tags.map((tag) => ({ name: tag })),
      },
      ViewCount: {
        number: post.view_count,
      },
      IsBot: {
        checkbox: post.is_bot_generated,
      },
      PublishedAt: post.published_at
        ? { date: { start: post.published_at } }
        : { date: null },
    }

    if (post.notion_page_id) {
      // 기존 페이지 업데이트
      await notion.pages.update({
        page_id: post.notion_page_id,
        properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
      })

      // 콘텐츠 블록 업데이트
      if (post.content) {
        const blocks = await notion.blocks.children.list({ block_id: post.notion_page_id })
        for (const block of blocks.results) {
          await notion.blocks.delete({ block_id: block.id })
        }
        await notion.blocks.children.append({
          block_id: post.notion_page_id,
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: post.content.substring(0, 2000) } }],
              },
            },
          ],
        })
      }

      return post.notion_page_id
    } else {
      // 새 페이지 생성
      const response = await notion.pages.create({
        parent: { database_id: DATABASE_ID },
        properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
        children: post.content
          ? [
              {
                object: 'block' as const,
                type: 'paragraph' as const,
                paragraph: {
                  rich_text: [{ type: 'text' as const, text: { content: post.content.substring(0, 2000) } }],
                },
              },
            ]
          : [],
      })

      return response.id
    }
  } catch (error) {
    console.error('Notion 동기화 오류:', error)
    return null
  }
}

export async function createNotionPage(data: {
  title: string
  content: string
  tags?: string[]
  category?: string
}): Promise<string | null> {
  try {
    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        Title: {
          title: [{ text: { content: data.title } }],
        },
        Status: {
          select: { name: '공개' },
        },
        Tags: {
          multi_select: (data.tags || []).map((tag) => ({ name: tag })),
        },
      },
      children: [
        {
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [{ type: 'text' as const, text: { content: data.content.substring(0, 2000) } }],
          },
        },
      ],
    })

    return response.id
  } catch (error) {
    console.error('Notion 페이지 생성 오류:', error)
    return null
  }
}

export async function getNotionDatabase() {
  try {
    // Notion SDK의 pages.list를 사용해 데이터베이스 내 페이지 목록 조회
    const response = await (notion as unknown as { databases: { query: (args: { database_id: string; sorts: { property: string; direction: string }[]; page_size: number }) => Promise<{ results: unknown[] }> } }).databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: 'PublishedAt', direction: 'descending' }],
      page_size: 50,
    })
    return response.results
  } catch (error) {
    console.error('Notion DB 조회 오류:', error)
    return []
  }
}
