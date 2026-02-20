import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function DebugPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''

  const supabase = createAdminClient()

  // 검색어가 있으면 title 또는 slug로 검색
  let postsQuery = supabase
    .from('posts')
    .select('id, title, slug, is_published, created_at, author_id')
    .order('created_at', { ascending: false })
    .limit(20)

  if (query) {
    postsQuery = postsQuery.or(`title.ilike.%${query}%,slug.ilike.%${query}%`)
  }

  const { data: posts } = await postsQuery

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">게시글 디버그</h1>

      <form method="get" className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="제목 또는 slug 검색..."
          className="px-4 py-2 border rounded w-full max-w-md"
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded"
        >
          검색
        </button>
      </form>

      <div className="space-y-4">
        {posts?.map((post) => (
          <div
            key={post.id}
            className="border p-4 rounded bg-white dark:bg-gray-900"
          >
            <div className="grid gap-2 text-sm">
              <div>
                <strong>ID:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{post.id}</code>
              </div>
              <div>
                <strong>Title:</strong> {post.title}
              </div>
              <div className="break-all">
                <strong>Slug:</strong>{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {post.slug}
                </code>
                <a
                  href={`/posts/${post.slug}`}
                  target="_blank"
                  className="ml-2 text-indigo-600 hover:underline"
                >
                  [열기]
                </a>
              </div>
              <div>
                <strong>Published:</strong>{' '}
                <span
                  className={
                    post.is_published
                      ? 'text-green-600 font-semibold'
                      : 'text-red-600 font-semibold'
                  }
                >
                  {post.is_published ? '✓ 발행됨' : '✗ 미발행'}
                </span>
              </div>
              <div>
                <strong>Created:</strong>{' '}
                {new Date(post.created_at).toLocaleString('ko-KR')}
              </div>
              <div>
                <strong>Slug Length:</strong> {post.slug.length} chars
              </div>
              <div className="text-xs text-gray-500 break-all">
                <strong>Hex:</strong> {Buffer.from(post.slug).toString('hex')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-gray-500">게시글이 없습니다.</div>
      ) : null}
    </div>
  )
}
