'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Folder {
  id: string
  name: string
}

export default function ImportExportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchFolders()
    }
  }, [session])

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders?all=true')
      if (res.ok) {
        const data = await res.json()
        setFolders(data)
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setMessage(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate format
      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error('无效的导入文件格式')
      }

      const res = await fetch(`/api/prompts/import?userId=${session?.user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: data.prompts,
          folderId: selectedFolder || undefined,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `成功导入 ${result.count} 个 prompts${result.errors.length > 0 ? `，${result.errors.length} 个失败` : ''}`,
        })
      } else {
        throw new Error(result.error || '导入失败')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: (error as Error).message || '导入失败，请检查文件格式',
      })
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    setMessage(null)

    try {
      const params = new URLSearchParams()
      params.set('userId', session?.user?.id || '')
      if (selectedFolder) {
        params.set('folderId', selectedFolder)
      }

      const res = await fetch(`/api/prompts/export?${params}`)

      if (!res.ok) {
        throw new Error('导出失败')
      }

      const data = await res.json()
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage({
        type: 'success',
        text: `成功导出 ${data.count} 个 prompts`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: (error as Error).message || '导出失败',
      })
    } finally {
      setExportLoading(false)
    }
  }

  const downloadSampleTemplate = () => {
    const sample = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: 2,
      prompts: [
        {
          title: '示例 Prompt 1',
          content: '这是我的第一个 prompt 内容...',
          description: '这是一个示例描述',
          tags: ['示例', '测试'],
          isFavorite: false,
          isPinned: false,
          isPublic: false,
        },
        {
          title: '示例 Prompt 2',
          content: '这是我的第二个 prompt 内容...',
          description: '另一个示例描述',
          tags: ['示例'],
          isFavorite: true,
        },
      ],
    }

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompts-template.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-800">
              Prompt Vault
            </Link>
            <nav className="flex gap-4">
              <Link href="/prompts" className="text-gray-600 hover:text-blue-600">
                我的 Prompts
              </Link>
              <Link href="/templates" className="text-gray-600 hover:text-blue-600">
                模板市场
              </Link>
              <Link href="/import-export" className="text-blue-600 font-medium">
                导入/导出
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">导入 / 导出</h1>

        {/* Folder Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择目标文件夹（可选）
          </label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">根目录（无文件夹）</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📥 导入 Prompts
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              从 JSON 文件导入 prompts。支持批量导入，文件格式如下：
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`{
  "prompts": [
    {
      "title": "Prompt 标题",
      "content": "Prompt 内容",
      "description": "描述（可选）",
      "tags": ["标签1", "标签2"],
      "isFavorite": false,
      "isPinned": false,
      "isPublic": false
    }
  ]
}`}
              </pre>
            </div>
            <div className="flex gap-4">
              <button
                onClick={downloadSampleTemplate}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                下载模板
              </button>
              <label className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importLoading}
                  className="hidden"
                />
                <span className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50">
                  {importLoading ? '导入中...' : '选择文件导入'}
                </span>
              </label>
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📤 导出 Prompts
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              将你的 prompts 导出为 JSON 文件。可以导出全部或选择特定文件夹。
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                导出格式与导入格式兼容，方便迁移和备份。
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {exportLoading ? '导出中...' : '导出为 JSON 文件'}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">💡 提示</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 导入时选择的文件夹将作为所有导入 prompts 的默认文件夹</li>
            <li>• 导出时可以按文件夹筛选，导出特定分类的 prompts</li>
            <li>• 导出的文件包含标题、内容、描述、标签等完整信息</li>
            <li>• 支持跨平台迁移：导出的文件可以导入到其他 Prompt Vault 实例</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
