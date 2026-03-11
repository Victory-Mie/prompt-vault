import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/folders - List all folders for current user
// GET /api/folders?parentId=xxx - Get child folders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    const where: any = {
      userId: session.user.id,
    }

    if (parentId) {
      where.parentId = parentId
    } else {
      // By default, get root folders (no parent)
      where.parentId = null
    }

    const folders = await prisma.folder.findMany({
      where,
      include: {
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            prompts: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, parentId, sortOrder } = body

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    // Validate parent folder belongs to user if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          userId: session.user.id,
        },
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
      }
    }

    const folder = await prisma.folder.create({
      data: {
        userId: session.user.id,
        name,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
      },
      include: {
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}

// PUT /api/folders - Update a folder (including move prompts)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, parentId, sortOrder, movePromptsTo } = body

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Verify folder belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Prevent moving folder to itself or its descendants
    if (parentId && parentId === id) {
      return NextResponse.json({ error: 'Cannot move folder to itself' }, { status: 400 })
    }

    // Validate new parent folder if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          userId: session.user.id,
        },
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
      }

      // Check for circular reference (prevent moving to descendants)
      const isDescendant = await prisma.folder.findFirst({
        where: {
          parentId: id,
          userId: session.user.id,
        },
      })

      if (isDescendant && parentId === isDescendant.id) {
        return NextResponse.json({ error: 'Cannot move folder to its descendant' }, { status: 400 })
      }
    }

    // Move prompts to another folder
    if (movePromptsTo !== undefined) {
      await prisma.prompt.updateMany({
        where: {
          folderId: id,
          userId: session.user.id,
        },
        data: {
          folderId: movePromptsTo,
        },
      })
    }

    const folder = await prisma.folder.update({
      where: {
        id,
      },
      data: {
        name: name ?? existingFolder.name,
        parentId: parentId !== undefined ? (parentId || null) : existingFolder.parentId,
        sortOrder: sortOrder ?? existingFolder.sortOrder,
      },
      include: {
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    })

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

// DELETE /api/folders - Delete a folder
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Verify folder belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        children: true,
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    })

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check if folder has children
    if (existingFolder.children.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete folder with subfolders. Please delete subfolders first.' 
      }, { status: 400 })
    }

    // Delete folder (prompts will be set to null due to onDelete: SetNull)
    await prisma.folder.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
