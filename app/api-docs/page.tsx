export default function ApiDocsPage() {
  const endpoints = [
    {
      section: '게시글 API',
      items: [
        {
          method: 'GET',
          path: '/api/posts',
          desc: '게시글 목록 조회',
          auth: false,
          params: 'category, page, limit, tag',
          example: 'GET /api/posts?category=ai-news&page=1&limit=10',
        },
        {
          method: 'GET',
          path: '/api/posts/:id',
          desc: '단일 게시글 조회 (id 또는 slug)',
          auth: false,
          example: 'GET /api/posts/my-post-slug',
        },
        {
          method: 'POST',
          path: '/api/posts',
          desc: '게시글 생성 (봇/관리자)',
          auth: true,
          body: '{ title, content, excerpt, category_slug, tags, cover_image, source_url, is_members_only }',
        },
        {
          method: 'PUT',
          path: '/api/posts/:id',
          desc: '게시글 수정',
          auth: true,
        },
        {
          method: 'DELETE',
          path: '/api/posts/:id',
          desc: '게시글 삭제',
          auth: true,
        },
      ],
    },
    {
      section: '봇 API',
      items: [
        {
          method: 'POST',
          path: '/api/bot/post',
          desc: '봇 자동 게시글 생성 + Notion 자동 백업',
          auth: true,
          body: '{ title, content, excerpt?, category_slug?, tags?, cover_image?, source_url?, is_members_only? }',
          example: `curl -X POST https://yoursite.com/api/bot/post \\
  -H "Authorization: Bearer YOUR_BOT_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"AI 뉴스", "content":"내용...", "category_slug":"ai-news"}'`,
        },
        {
          method: 'GET',
          path: '/api/bot/post',
          desc: '봇 작업 로그 조회',
          auth: true,
        },
      ],
    },
    {
      section: 'Notion 백업 API',
      items: [
        {
          method: 'POST',
          path: '/api/notion-backup',
          desc: '게시글 Notion 동기화',
          auth: true,
          body: '{ post_id: "uuid" } 또는 { sync_all: true }',
        },
        {
          method: 'GET',
          path: '/api/notion-backup',
          desc: 'Notion 동기화 로그 조회',
          auth: true,
        },
      ],
    },
    {
      section: '강의 API',
      items: [
        {
          method: 'GET',
          path: '/api/courses',
          desc: '강의 목록',
          auth: false,
          params: 'level (beginner/intermediate/advanced), free (true/false)',
        },
        {
          method: 'POST',
          path: '/api/courses',
          desc: '강의 생성',
          auth: true,
          body: '{ title, description, thumbnail, price, is_free, level, tags }',
        },
      ],
    },
    {
      section: '멤버 API',
      items: [
        {
          method: 'GET',
          path: '/api/members',
          desc: '멤버 목록 조회',
          auth: true,
        },
        {
          method: 'POST',
          path: '/api/members',
          desc: '멤버십 업데이트',
          auth: true,
          body: '{ user_id, tier (free/basic/premium), expires_at? }',
        },
      ],
    },
  ]

  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">API 문서</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          AI 인사이트 허브 REST API 문서입니다. 봇 연동, 외부 서비스 연동에 활용하세요.
        </p>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">인증 방법</p>
          <code className="text-sm text-indigo-700 dark:text-indigo-400 font-mono">
            Authorization: Bearer {'{BOT_API_SECRET}'}
          </code>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
            🔒 표시된 엔드포인트는 API 키 인증이 필요합니다
          </p>
        </div>
      </div>

      {endpoints.map((section) => (
        <div key={section.section} className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
            {section.section}
          </h2>
          <div className="space-y-4">
            {section.items.map((item) => (
              <div
                key={`${item.method}-${item.path}`}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md font-mono ${methodColors[item.method]}`}>
                    {item.method}
                  </span>
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{item.path}</code>
                  {item.auth && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      🔒 인증 필요
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.desc}</p>
                {'params' in item && item.params && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                    <span className="font-medium">Query Params:</span> {item.params}
                  </div>
                )}
                {'body' in item && item.body && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Request Body:</p>
                    <code className="block text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                      {item.body}
                    </code>
                  </div>
                )}
                {'example' in item && item.example && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">예시:</p>
                    <code className="block text-xs bg-gray-900 text-green-400 p-3 rounded-lg font-mono whitespace-pre-wrap">
                      {item.example}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Quick Start */}
      <div className="bg-gray-900 text-gray-100 rounded-2xl p-8 mt-12">
        <h2 className="text-xl font-bold mb-4 text-white">봇 빠른 시작 예시 (Python)</h2>
        <pre className="text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">{`import requests

BOT_SECRET = "your_bot_secret"
BASE_URL = "https://yoursite.com"

headers = {
    "Authorization": f"Bearer {BOT_SECRET}",
    "Content-Type": "application/json"
}

# 게시글 자동 생성 + Notion 백업
response = requests.post(
    f"{BASE_URL}/api/bot/post",
    headers=headers,
    json={
        "title": "2026년 AI 트렌드 정리",
        "content": "올해 주목할 AI 트렌드...",
        "category_slug": "ai-news",
        "tags": ["AI트렌드", "2026"],
        "source_url": "https://example.com/article"
    }
)

print(response.json())
# {"message": "게시글이 성공적으로 생성되었습니다", "post_id": "uuid..."}
`}</pre>
      </div>
    </div>
  )
}
