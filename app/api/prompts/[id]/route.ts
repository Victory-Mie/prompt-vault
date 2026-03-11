import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/prompts/[id] - Get a single prompt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        tags: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
      },
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    return NextResponse.json(prompt)
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 })
  }
}

// PUT /api/prompts/[id] - Update a prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if prompt exists and belongs to user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, description, folderId, tags, isPublic, isFavorite, isPinned, modelConfig } = body

    // If content changed, create a version
    if (content && content !== existingPrompt.content) {
      // Get latest version number
      const latestVersion = await prisma.promptVersion.findFirst({
        where: { promptId: params.id },
        orderBy: { versionNumber: 'desc' },
      })

      await prisma.promptVersion.create({
        data: {
          promptId: params.id,
          content: existingPrompt.content,
          versionNumber: (latestVersion?.versionNumber || 0) + 1,
        },
      })
    }

    const prompt = await prisma.prompt.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(description !== undefined && { description }),
        ...(folderId !== undefined && { folderId: folderId || null }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(isPinned !== undefined && { isPinned }),
        ...(modelConfig && { modelConfig }),
        ...(tags && {
          tags: {
            set: [],
            connectOrCreate: tags.map((tag: string) => ({
              where: { userId_name: { userId: session.user.id, name: tag } },
              create: { userId: session.user.id, name: tag },
            })),
          },
        }),
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

    return NextResponse.json(prompt)
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
  }
}

// DELETE /api/prompts/[id] - Delete a prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if prompt exists and belongs to user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    await prisma.prompt.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 })
  }
}
