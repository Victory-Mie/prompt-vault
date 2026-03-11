import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/prompts/[id]/move - Move a prompt to a folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { folderId } = body

    // Verify prompt belongs to user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Verify folder exists and belongs to user (if folderId is provided)
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.user.id,
        },
      })

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
    }

    const prompt = await prisma.prompt.update({
      where: {
        id: params.id,
      },
      data: {
        folderId: folderId || null,
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
    console.error('Error moving prompt:', error)
    return NextResponse.json({ error: 'Failed to move prompt' }, { status: 500 })
  }
}
