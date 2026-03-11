'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

interface Prompt {
  id: string
  title: string
  content: string
  description: string | null
  isFavorite: boolean
  isPinned: boolean
  isPublic: boolean
  tags: { id: string; name: string }[]
  folder: { id: string; name: string } | null
  versions: { id: string; versionNumber: number; createdAt: string }[]
}

interface Folder {
  id: string
  name: string
}

export default function EditPromptPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const promptId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    folderId: '',
    tags: '',
    isPublic: false,
    isFavorite: false,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session) {
      fetchPrompt()
    }
  }, [status, session, router])

  const fetchPrompt = async () => {
    try {
      const res = await fetch(`/api/prompts/${promptId}`)
      if (res.ok) {
        const data = await res.json()
        setPrompt(data)
        setFormData({
          title: data.title,
          content: data.content,
          description: data.description || '',
          folderId: data.folder?.id || '',
          tags: data.tags.map((t: any) => t.name).join(', '),
          isPublic: data.isPublic,
          isFavorite: data.isFavorite,
        })
      } else {
        alert('Prompt not found')
        router.push('/prompts')
      }
    } catch (error) {
      console.error('Error fetching prompt:', error)
      alert('Failed to load prompt')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Title and content are required')
      return
    }

    setSaving(true)
    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const res = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          folderId: formData.folderId || null,
          tags,
        }),
      })

      if (res.ok) {
        const updatedPrompt = await res.json()
        setPrompt(updatedPrompt)
        alert('Prompt saved successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update prompt')
      }
    } catch (error) {
      console.error('Error updating prompt:', error)
      alert('Failed to update prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this prompt?')) return
    
    try {
      const res = await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/prompts')
      } else {
        alert('Failed to delete prompt')
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
      alert('Failed to delete prompt')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!prompt) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/prompts"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Edit Prompt</h1>
            </div>
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete Prompt
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter prompt title"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Prompt Content *
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter your AI prompt here..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of what this prompt does"
            />
          </div>

          {/* Folder & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="folderId" className="block text-sm font-medium text-gray-700 mb-1">
                Folder
              </label>
              <select
                id="folderId"
                value={formData.folderId}
                onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                id="tags"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="coding, writing, marketing"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFavorite}
                onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-700">Add to favorites</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Make public</span>
            </label>
          </div>

          {/* Version Info */}
          {prompt.versions && prompt.versions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Version History</h3>
              <p className="text-sm text-gray-500">
                {prompt.versions.length} version(s) saved
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link
              href="/prompts"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
