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

    // Handle export request
    if (searchParams.get('export') === 'true') {
      return handleExport(session.user.id, folderId)
    }

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
// POST /api/prompts/import - Import prompts from JSON
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Handle import request
    if (searchParams.get('import') === 'true') {
      return handleImport(request, session.user.id)
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

// Export prompts to JSON
async function handleExport(userId: string, folderId?: string | null) {
  try {
    const where: any = { userId }
    if (folderId) {
      where.folderId = folderId
    }

    const prompts = await prisma.prompt.findMany({
      where,
      include: {
        tags: true,
      },
    })

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: prompts.length,
      prompts: prompts.map((p) => ({
        title: p.title,
        content: p.content,
        description: p.description,
        modelConfig: p.modelConfig,
        isPublic: p.isPublic,
        isFavorite: p.isFavorite,
        isPinned: p.isPinned,
        tags: p.tags.map((t) => t.name),
      })),
    }

    return NextResponse.json(exportData)
  } catch (error) {
    console.error('Error exporting prompts:', error)
    return NextResponse.json({ error: 'Failed to export prompts' }, { status: 500 })
  }
}

// Import prompts from JSON
async function handleImport(request: NextRequest, userId: string) {
  try {
    const body = await request.json()
    const { prompts, folderId } = body

    if (!prompts || !Array.isArray(prompts)) {
      return NextResponse.json({ error: 'Invalid import data' }, { status: 400 })
    }

    const errors: string[] = []
    let successCount = 0

    // If folderId is provided, verify it belongs to the user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
      })

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
    }

    for (let i = 0; i < prompts.length; i++) {
      const item = prompts[i]
      
      try {
        // Handle tags
        const tagConnections: { id: string }[] = []
        if (item.tags && item.tags.length > 0) {
          for (const tagName of item.tags) {
            let tag = await prisma.tag.findFirst({
              where: { userId, name: tagName },
            })

            if (!tag) {
              tag = await prisma.tag.create({
                data: { userId, name: tagName },
              })
            }
            tagConnections.push({ id: tag.id })
          }
        }

        await prisma.prompt.create({
          data: {
            title: item.title,
            content: item.content,
            description: item.description || null,
            folderId: folderId || null,
            modelConfig: item.modelConfig || {},
            isPublic: item.isPublic || false,
            isFavorite: item.isFavorite || false,
            isPinned: item.isPinned || false,
            userId,
            tags: {
              connect: tagConnections,
            },
          },
        })
        successCount++
      } catch (error) {
        errors.push(`Prompt "${item.title}" (index ${i}): ${(error as Error).message}`)
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      count: successCount,
      errors,
    })
  } catch (error) {
    console.error('Error importing prompts:', error)
    return NextResponse.json({ error: 'Failed to import prompts' }, { status: 500 })
  }
}
