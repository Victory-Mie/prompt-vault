import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/prompts - List all prompts for current user
// GET /api/prompts?folderId=xxx - Filter by folder
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const isFavorite = searchParams.get('isFavorite')
    const search = searchParams.get('search')

    const where: any = {
      userId: session.user.id,
    }

    if (folderId) {
      where.folderId = folderId
    }

    if (isFavorite === 'true') {
      where.isFavorite = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const prompts = await prisma.prompt.findMany({
      where,
      include: {
        tags: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return NextResponse.json(prompts)
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, description, folderId, tags, isPublic, isFavorite, modelConfig } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const prompt = await prisma.prompt.create({
      data: {
        userId: session.user.id,
        title,
        content,
        description,
        folderId: folderId || null,
        isPublic: isPublic || false,
        isFavorite: isFavorite || false,
        modelConfig: modelConfig || {},
        tags: tags?.length > 0 ? {
          connectOrCreate: tags.map((tag: string) => ({
            where: { userId_name: { userId: session.user.id, name: tag } },
            create: { userId: session.user.id, name: tag },
          })),
        } : undefined,
      },
      include: {
        tags: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
  }
}
