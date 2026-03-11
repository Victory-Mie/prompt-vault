import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Hot Words / Popular Searches API
 * 
 * Returns popular tags and frequently used prompts
 * 
 * GET /api/search/hot
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get most used tags
    const popularTags = await prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            prompts: true,
          },
        },
      },
      orderBy: {
        prompts: { _count: 'desc' },
      },
      take: 10,
    })

    // Get most used prompts
    const popularPrompts = await prisma.prompt.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        usageCount: true,
      },
      orderBy: {
        usageCount: 'desc',
      },
      take: 10,
    })

    // Get recently updated prompts
    const recentPrompts = await prisma.prompt.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      hotTags: popularTags.map(tag => ({
        name: tag.name,
        count: tag._count.prompts,
        color: tag.color,
      })),
      popularPrompts: popularPrompts.map(p => ({
        id: p.id,
        title: p.title,
        usageCount: p.usageCount,
      })),
      recentPrompts: recentPrompts.map(p => ({
        id: p.id,
        title: p.title,
        updatedAt: p.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Hot words error:', error)
    return NextResponse.json(
      { error: 'Failed to get hot words' },
      { status: 500 }
    )
  }
}
