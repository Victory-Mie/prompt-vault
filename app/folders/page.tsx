'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Folder {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  children: { id: string; name: string }[]
  _count: {
    prompts: number
  }
}

export default function FoldersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    sortOrder: 0,
  })
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [prompts, setPrompts] = useState<{ id: string; title: string; folderId: string | null }[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchFolders()
      fetchAllPrompts()
    }
  }, [session])

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      if (res.ok) {
        const data = await res.json()
        setFolders(data)
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPrompts = async () => {
    try {
      const res = await fetch('/api/prompts')
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.map((p: any) => ({ id: p.id, title: p.title, folderId: p.folderId })))
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/folders'
      const method = editingFolder ? 'PUT' : 'POST'
      const body = editingFolder
        ? { id: editingFolder.id, name: formData.name, parentId: formData.parentId || null, sortOrder: formData.sortOrder }
        : { name: formData.name, parentId: formData.parentId || null, sortOrder: formData.sortOrder }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingFolder(null)
        setFormData({ name: '', parentId: '', sortOrder: 0 })
        fetchFolders()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save folder')
      }
    } catch (error) {
      console.error('Error saving folder:', error)
      alert('Failed to save folder')
    }
  }

  const handleEdit = (folder: Folder) => {
    setEditingFolder(folder)
    setFormData({
      name: folder.name,
      parentId: folder.parentId || '',
      sortOrder: folder.sortOrder,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this folder? Prompts in this folder will be moved to no folder.')) {
      return
    }

    try {
      const res = await fetch(`/api/folders?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchFolders()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const openMoveModal = (promptId: string) => {
    setSelectedPromptId(promptId)
    setShowMoveModal(true)
  }

  const handleMovePrompt = async (folderId: string | null) => {
    if (!selectedPromptId) return

    try {
      const res = await fetch(`/api/prompts/${selectedPromptId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })

      if (res.ok) {
        setShowMoveModal(false)
        setSelectedPromptId(null)
        fetchAllPrompts()
        alert('Prompt moved successfully')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to move prompt')
      }
    } catch (error) {
      console.error('Error moving prompt:', error)
      alert('Failed to move prompt')
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
              <h1 className="text-2xl font-bold text-gray-900">Folders</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your prompt folders</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/tags"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🏷️ Tags
              </Link>
              <Link
                href="/prompts"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back
              </Link>
              <button
                onClick={() => {
                  setEditingFolder(null)
                  setFormData({ name: '', parentId: '', sortOrder: 0 })
                  setShowModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Folder
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Prompts quick move section */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-lg font-semibold mb-3">Quick Move Prompt</h2>
          <div className="flex flex-wrap gap-2">
            {prompts.filter(p => !p.folderId).slice(0, 5).map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => openMoveModal(prompt.id)}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
              >
                {prompt.title.slice(0, 20)}...
              </button>
            ))}
            {prompts.filter(p => !p.folderId).length === 0 && (
              <p className="text-gray-500 text-sm">No prompts without folder</p>
            )}
          </div>
        </div>

        {/* Folders List */}
        {folders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <p className="text-gray-500 mb-4">No folders yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-600 hover:underline"
            >
              Create your first folder
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subfolders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prompts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {folders.map((folder) => (
                  <tr key={folder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">📁</span>
                        <span className="font-medium text-gray-900">{folder.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500">{folder.children.length}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500">{folder._count.prompts}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(folder)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(folder.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingFolder ? 'Edit Folder' : 'New Folder'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
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
                  Parent Folder (optional)
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (Root)</option>
                  {folders
                    .filter((f) => f.id !== editingFolder?.id)
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingFolder(null)
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingFolder ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Prompt Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Move Prompt to Folder</h2>
            <div className="space-y-2">
              <button
                onClick={() => handleMovePrompt(null)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg"
              >
                📭 No Folder
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMovePrompt(folder.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center"
                >
                  <span className="mr-2">📁</span>
                  {folder.name}
                  <span className="ml-auto text-gray-400 text-sm">({folder._count.prompts})</span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowMoveModal(false)
                  setSelectedPromptId(null)
                }}
                className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
