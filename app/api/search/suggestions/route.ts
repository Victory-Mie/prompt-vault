import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Search Suggestions API
 * 
 * Provides autocomplete suggestions as user types
 * 
 * GET /api/search/suggestions?q=key
 * 
 * Query Parameters:
 * - q: Partial search keyword
 * - limit: Max suggestions (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    const userId = session.user.id

    // If no query, return recent/popular searches instead
    if (!query || query.trim().length === 0) {
      // Return recent prompts and popular tags
      const [recentPrompts, popularTags] = await Promise.all([
        prisma.prompt.findMany({
          where: { userId },
          select: { title: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        prisma.tag.findMany({
          where: { userId },
          include: {
            _count: { select: { prompts: true } },
          },
          orderBy: {
            prompts: { _count: 'desc' },
          },
          take: 5,
        }),
      ])

      return NextResponse.json({
        suggestions: [
          ...recentPrompts.map(p => ({ type: 'recent', value: p.title })),
          ...popularTags.map(t => ({ type: 'tag', value: t.name })),
        ],
      })
    }

    const searchTerm = query.trim()

    // Get suggestions from multiple sources
    const [titleMatches, tagMatches, contentMatches] = await Promise.all([
      // Match prompt titles
      prisma.prompt.findMany({
        where: {
          userId,
          title: { startsWith: searchTerm, mode: 'insensitive' },
        },
        select: { title: true },
        orderBy: { usageCount: 'desc' },
        take: limit,
      }),
      // Match tags
      prisma.tag.findMany({
        where: {
          userId,
          name: { startsWith: searchTerm, mode: 'insensitive' },
        },
        select: { name: true },
        orderBy: { name: 'asc' },
        take: limit,
      }),
      // Match content (for broader suggestions)
      prisma.prompt.findMany({
        where: {
          userId,
          content: { contains: searchTerm, mode: 'insensitive' },
        },
        select: { title: true, content: true },
        orderBy: { usageCount: 'desc' },
        take: 3,
      }),
    ])

    // Build suggestions list with deduplication
    const seen = new Set<string>()
    const suggestions: { type: string; value: string }[] = []

    // Add title matches first (highest priority)
    for (const item of titleMatches) {
      if (!seen.has(item.title)) {
        seen.add(item.title)
        suggestions.push({ type: 'title', value: item.title })
      }
    }

    // Add tag matches
    for (const item of tagMatches) {
      if (!seen.has(item.name)) {
        seen.add(item.name)
        suggestions.push({ type: 'tag', value: item.name })
      }
    }

    // Add content-based suggestions
    for (const item of contentMatches) {
      if (!seen.has(item.title)) {
        seen.add(item.title)
        // Extract a snippet around the match
        const idx = item.content.toLowerCase().indexOf(searchTerm.toLowerCase())
        const snippet = idx >= 0 
          ? item.content.slice(Math.max(0, idx - 20), idx + searchTerm.length + 20)
          : item.content.slice(0, 40)
        suggestions.push({ 
          type: 'content', 
          value: `"${snippet}..."` 
        })
      }
    }

    return NextResponse.json({
      query,
      suggestions: suggestions.slice(0, limit),
    })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
