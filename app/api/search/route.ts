import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Global Search API
 * 
 * GET /api/search?q=keyword
 * 
 * Query Parameters:
 * - q: Search keyword (required)
 * - type: Filter by type (prompt, tag, folder) - optional, default all
 * - limit: Max results (default 20)
 * 
 * Searches across:
 * - Prompt title, content, description
 * - Tags
 * - Folders
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') // 'prompt' | 'tag' | 'folder' | 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Search query is required' 
      }, { status: 400 })
    }

    const userId = session.user.id
    const searchTerm = query.trim()

    // Build search conditions using LIKE for MVP
    // In production, consider using full-text search or MeiliSearch
    const results: {
      prompts: any[]
      tags: any[]
      folders: any[]
    } = {
      prompts: [],
      tags: [],
      folders: []
    }

    // Search prompts (title, content, description, tags)
    if (!type || type === 'prompt' || type === 'all') {
      results.prompts = await prisma.prompt.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          tags: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { usageCount: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: limit,
      })
    }

    // Search tags
    if (!type || type === 'tag' || type === 'all') {
      results.tags = await prisma.tag.findMany({
        where: {
          userId,
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        include: {
          _count: {
            select: {
              prompts: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        take: 10,
      })
    }

    // Search folders
    if (!type || type === 'folder' || type === 'all') {
      results.folders = await prisma.folder.findMany({
        where: {
          userId,
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        include: {
          _count: {
            select: {
              prompts: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        take: 10,
      })
    }

    // Calculate total results
    const totalResults = 
      results.prompts.length + 
      results.tags.length + 
      results.folders.length

    return NextResponse.json({
      query,
      total: totalResults,
      results,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
