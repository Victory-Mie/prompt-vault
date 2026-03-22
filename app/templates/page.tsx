'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  rating: number
  ratingCount: number
  downloadCount: number
  isOfficial: boolean
  applicableModels: string[]
  createdAt: string
  user: {
    id: string
    name: string
    avatarUrl: string
  } | null
}

const CATEGORIES = [
  { slug: 'writing', name: '写作辅助', icon: '✍️' },
  { slug: 'coding', name: '编程开发', icon: '💻' },
  { slug: 'marketing', name: '营销文案', icon: '📢' },
  { slug: 'education', name: '教育培训', icon: '📚' },
  { slug: 'productivity', name: '效率提升', icon: '⚡' },
  { slug: 'other', name: '其他', icon: '📦' },
]

export default function TemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<'popular' | 'newest' | 'rating'>('popular')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchTemplates()
    }
  }, [session, search, category, sort, page])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (category) params.set('category', category)
      params.set('sort', sort)
      params.set('page', page.toString())
      params.set('limit', '12')

      const res = await fetch(`/api/templates?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`)
      if (res.ok) {
        const template = await res.json()
        // Create a new prompt from template
        const promptRes = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: template.title,
            content: template.content,
            description: template.description,
          }),
        })
        if (promptRes.ok) {
          const prompt = await promptRes.json()
          router.push(`/prompts/${prompt.id}`)
        }
      }
    } catch (error) {
      console.error('Error using template:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-800">
              Prompt Vault
            </Link>
            <nav className="flex gap-4">
              <Link href="/prompts" className="text-gray-600 hover:text-blue-600">
                我的 Prompts
              </Link>
              <Link href="/templates" className="text-blue-600 font-medium">
                模板市场
              </Link>
              <Link href="/import-export" className="text-gray-600 hover:text-blue-600">
                导入/导出
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="搜索模板..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部分类</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="popular">最受欢迎</option>
              <option value="newest">最新</option>
              <option value="rating">评分最高</option>
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无模板</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {template.title}
                  </h3>
                  {template.isOfficial && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                      官方
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <span>⭐ {template.rating.toFixed(1)}</span>
                    <span>({template.ratingCount})</span>
                  </div>
                  <span>📥 {template.downloadCount}</span>
                </div>
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  使用模板
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
