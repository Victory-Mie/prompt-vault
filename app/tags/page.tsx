'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  _count: {
    prompts: number
  }
}

const TAG_COLORS = [
  '#58A6FF', // Blue
  '#F85149', // Red
  '#3FB950', // Green
  '#A371F7', // Purple
  '#F0883E', // Orange
  '#DB61A2', // Pink
  '#79C0FF', // Light Blue
  '#7EE787', // Light Green
  '#FFA657', // Light Orange
  '#D29922', // Yellow
]

export default function TagsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: TAG_COLORS[0],
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchTags()
    }
  }, [session])

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        setTags(data)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/tags'
      const method = editingTag ? 'PUT' : 'POST'
      const body = editingTag
        ? { id: editingTag.id, name: formData.name, color: formData.color }
        : { name: formData.name, color: formData.color }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingTag(null)
        setFormData({ name: '', color: TAG_COLORS[0] })
        fetchTags()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save tag')
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      alert('Failed to save tag')
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      color: tag.color,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all prompts.')) {
      return
    }

    try {
      const res = await fetch(`/api/tags?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTags()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete tag')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert('Failed to delete tag')
    }
  }

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your prompt tags</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/folders"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                📁 Folders
              </Link>
              <Link
                href="/prompts"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back
              </Link>
              <button
                onClick={() => {
                  setEditingTag(null)
                  setFormData({ name: '', color: TAG_COLORS[0] })
                  setShowModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Tag
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tags Grid */}
        {filteredTags.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            {searchTerm ? (
              <p className="text-gray-500">No tags found matching "{searchTerm}"</p>
            ) : (
              <>
                <p className="text-gray-500 mb-4">No tags yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-blue-600 hover:underline"
                >
                  Create your first tag
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-semibold text-gray-900">{tag.name}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {tag._count.prompts} prompt{tag._count.prompts !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingTag ? 'Edit Tag' : 'New Tag'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preview
                </label>
                <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                  <span
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-gray-900">{formData.name || 'Tag name'}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingTag(null)
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTag ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
