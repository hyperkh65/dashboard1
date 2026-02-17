import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Shield } from 'lucide-react'

export default async function NewPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name, id')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">관리자 권한이 없습니다.</p>
        <Link href="/" className="text-indigo-600 hover:underline mt-4 inline-block">홈으로</Link>
      </div>
    )
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  async function createPost(formData: FormData) {
    'use server'

    const supabaseAdmin = createAdminClient()
    const supabaseServer = await createClient()
    const { data: { user: serverUser } } = await supabaseServer.auth.getUser()
    if (!serverUser) redirect('/login')

    const { data: serverProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', serverUser.id)
      .single()
    if (!serverProfile?.is_admin) redirect('/admin')

    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const excerpt = formData.get('excerpt') as string
    const categoryId = formData.get('category_id') as string
    const tagsRaw = formData.get('tags') as string
    const coverImage = formData.get('cover_image') as string
    const sourceUrl = formData.get('source_url') as string
    const isMembersOnly = formData.get('is_members_only') === 'on'
    const isPublished = formData.get('is_published') === 'on'

    if (!title || !content) return

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50) +
      '-' +
      Date.now()

    const { data: newPost, error } = await supabaseAdmin
      .from('posts')
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 200),
        cover_image: coverImage || null,
        category_id: categoryId || null,
        author_id: serverUser.id,
        tags,
        source_url: sourceUrl || null,
        is_members_only: isMembersOnly,
        is_published: isPublished,
        is_bot_generated: false,
        published_at: isPublished ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    redirect(`/posts/${newPost.slug}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          관리자
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <div className="flex items-center gap-2 text-indigo-600">
          <FileText className="w-4 h-4" />
          <span className="font-medium">AI 인사이트 새 글</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">새 글 작성</h1>

        <form action={createPost} className="space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="글 제목을 입력하세요"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              카테고리
            </label>
            <select
              name="category_id"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="">카테고리 선택</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 요약 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              요약 <span className="text-gray-400 text-xs">(비워두면 본문 앞 200자 자동 사용)</span>
            </label>
            <textarea
              name="excerpt"
              rows={2}
              placeholder="글 목록에 표시될 짧은 요약"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          {/* 본문 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              본문 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              required
              rows={16}
              placeholder="글 내용을 입력하세요"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-y font-mono leading-relaxed"
            />
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              태그 <span className="text-gray-400 text-xs">(쉼표로 구분: AI, GPT, 머신러닝)</span>
            </label>
            <input
              type="text"
              name="tags"
              placeholder="AI, GPT-4, 프롬프트"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 커버 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              커버 이미지 URL <span className="text-gray-400 text-xs">(선택)</span>
            </label>
            <input
              type="url"
              name="cover_image"
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 출처 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              출처 URL <span className="text-gray-400 text-xs">(선택)</span>
            </label>
            <input
              type="url"
              name="source_url"
              placeholder="https://example.com/article"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 옵션 */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">즉시 발행</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="is_members_only"
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">멤버 전용</span>
            </label>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              발행하기
            </button>
            <Link
              href="/admin"
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
