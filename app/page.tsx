'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Prompt Vault</h1>
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {session.user?.name || session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign In
            </Link>
          )}
        </header>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Prompt Vault!</h2>
          <p className="text-gray-600 mb-4">
            Your personal AI prompt management system.
          </p>
          
          {session ? (
            <div className="space-y-4">
              <p className="text-green-600">You are logged in!</p>
              <div>
                <Link
                  href="/prompts"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
                >
                  My Prompts
                </Link>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">
              Please <Link href="/login" className="text-blue-600 hover:underline">sign in</Link> to get started.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
