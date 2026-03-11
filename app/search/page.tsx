'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface SearchResult {
  id: string
  title: string
  content: string
  description: string | null
  isPinned: boolean
  isFavorite: boolean
  tags: { id: string; name: string; color: string }[]
  folder: { id: string; name: string } | null
}

interface Suggestion {
  type: string
  value: string
}

interface HotData {
  hotTags: { name: string; count: number; color: string }[]
  popularPrompts: { id: string; title: string; usageCount: number }[]
  recentPrompts: { id: string; title: string }[]
}

export default function SearchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hotData, setHotData] = useState<HotData | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load hot words on mount
  useEffect(() => {
    if (session) {
      fetchHotWords()
    }
  }, [session])

  // Search when query changes
  useEffect(() => {
    if (query.trim().length > 0) {
      performSearch(query)
      fetchSuggestions(query)
    } else {
      setResults([])
      setTags([])
      setFolders([])
      setSuggestions([])
    }
  }, [query])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchHotWords = async () => {
    try {
      const res = await fetch('/api/search/hot')
      if (res.ok) {
        const data = await res.json()
        setHotData(data)
      }
    } catch (error) {
      console.error('Error fetching hot words:', error)
    }
  }

  const fetchSuggestions = async (q: string) => {
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }

  const performSearch = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results?.prompts || [])
        setTags(data.results?.tags || [])
        setFolders(data.results?.folders || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSuggestionClick = (value: string) => {
    setQuery(value)
    setShowSuggestions(false)
    router.push(`/search?q=${encodeURIComponent(value)}`)
  }

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      })
      // Refresh results
      if (query) performSearch(query)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  if (status === 'loading') {
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
            <div className="flex items-center gap-4">
              <Link href="/prompts" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Search</h1>
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
        {/* Search Box */}
        <div className="mb-8" ref={suggestionRef}>
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search prompts, tags, folders..."
                className="w-full px-5 py-3 pl-12 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.value)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      suggestion.type === 'title' ? 'bg-blue-100 text-blue-700' :
                      suggestion.type === 'tag' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {suggestion.type}
                    </span>
                    <span className="text-gray-700">{suggestion.value}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Results or Hot Words */}
        {query.trim() === '' ? (
          /* Hot Words Section */
          <div className="space-y-8">
            {hotData && (
              <>
                {/* Popular Tags */}
                {hotData.hotTags.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Popular Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {hotData.hotTags.map((tag) => (
                        <button
                          key={tag.name}
                          onClick={() => handleSuggestionClick(tag.name)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          {tag.name} ({tag.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Prompts */}
                {hotData.popularPrompts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Frequently Used</h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {hotData.popularPrompts.map((prompt) => (
                        <Link
                          key={prompt.id}
                          href={`/prompts/${prompt.id}/edit`}
                          className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="font-medium text-gray-900 truncate">{prompt.title}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Used {prompt.usageCount} times
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Prompts */}
                {hotData.recentPrompts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Recently Updated</h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {hotData.recentPrompts.map((prompt) => (
                        <Link
                          key={prompt.id}
                          href={`/prompts/${prompt.id}/edit`}
                          className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="font-medium text-gray-900 truncate">{prompt.title}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!hotData && (
              <div className="text-center py-12 text-gray-500">
                Start typing to search your prompts...
              </div>
            )}
          </div>
        ) : loading ? (
          /* Loading State */
          <div className="text-center py-12">
            <p className="text-gray-500">Searching...</p>
          </div>
        ) : (
          /* Search Results */
          <div className="space-y-6">
            {/* Tags Results */}
            {tags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Tags ({tags.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleSuggestionClick(tag.name)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name} ({tag._count?.prompts || 0})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Folders Results */}
            {folders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Folders ({folders.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="font-medium text-gray-900">📁 {folder.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {folder._count?.prompts || 0} prompts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompts Results */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Prompts ({results.length})
              </h2>
              
              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No prompts found for "{query}"
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {results.map((prompt) => (
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
                          <button
                            onClick={() => toggleFavorite(prompt.id, prompt.isFavorite)}
                            className={`p-1 rounded ${prompt.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                          >
                            {prompt.isFavorite ? '★' : '☆'}
                          </button>
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
                        
                        {prompt.folder && (
                          <div className="text-xs text-gray-500">
                            📁 {prompt.folder.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
