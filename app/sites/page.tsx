import { createClient } from '@/lib/supabase/server'
import { ExternalLink, Globe } from 'lucide-react'

interface PromotedSite {
  id: string
  name: string
  url: string
  description: string | null
  logo_url: string | null
  category: string
  order_index: number
}

export default async function SitesPage() {
  const supabase = await createClient()

  const { data: sites } = await supabase
    .from('promoted_sites')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  const grouped = (sites || []).reduce((acc: Record<string, PromotedSite[]>, site: PromotedSite) => {
    const cat = site.category || '일반'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(site)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">추천 사이트</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
          커뮤니티 멤버들이 추천하는 유용한 사이트 모음입니다.
        </p>
      </div>

      {(!sites || sites.length === 0) ? (
        <div className="text-center py-20 text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>등록된 사이트가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                {category}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((site) => (
                  <a
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {site.logo_url ? (
                        <img
                          src={site.logo_url}
                          alt={site.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-6 h-6 text-indigo-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {site.name}
                          </h3>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{site.url}</p>
                        {site.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {site.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
