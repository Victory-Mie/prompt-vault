'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Prompt {
  id: string
  title: string
  content: string
  description: string | null
  isFavorite: boolean
  isPinned: boolean
  isPublic: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
  tags: { id: string; name: string }[]
  folder: { id: string; name: string } | null
}

export default function PromptsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorites' | 'pinned'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchPrompts()
    }
  }, [session, search, filter])

  const fetchPrompts = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter === 'favorites') params.set('isFavorite', 'true')
      
      const res = await fetch(`/api/prompts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPrompts(filter === 'pinned' ? data.filter((p: Prompt) => p.isPinned) : data)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      })
      fetchPrompts()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const togglePin = async (id: string, isPinned: boolean) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !isPinned }),
      })
      fetchPrompts()
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const deletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return
    
    try {
      await fetch(`/api/prompts/${id}`, { method: 'DELETE' })
      fetchPrompts()
    } catch (error) {
      console.error('Error deleting prompt:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Prompts</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your AI prompts</p>
            </div>
            <Link
              href="/prompts/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Prompt
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Prompts</option>
            <option value="favorites">Favorites</option>
            <option value="pinned">Pinned</option>
          </select>
        </div>

        {/* Prompts List */}
        {prompts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No prompts yet</p>
            <Link
              href="/prompts/new"
              className="text-blue-600 hover:underline"
            >
              Create your first prompt
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
                  prompt.isPinned ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      href={`/prompts/${prompt.id}/edit`}
                      className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1"
                    >
                      {prompt.title}
                    </Link>
                    <div className="flex gap-1">
                      <button
                        onClick={() => togglePin(prompt.id, prompt.isPinned)}
                        className={`p-1 rounded ${prompt.isPinned ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                        title={prompt.isPinned ? 'Unpin' : 'Pin'}
                      >
                        📌
                      </button>
                      <button
                        onClick={() => toggleFavorite(prompt.id, prompt.isFavorite)}
                        className={`p-1 rounded ${prompt.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                        title={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {prompt.isFavorite ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {prompt.description || prompt.content.slice(0, 100)}...
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex gap-2">
                      {prompt.folder && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {prompt.folder.name}
                        </span>
                      )}
                      {prompt.isPublic && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Public
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deletePrompt(prompt.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
