import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'popular'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const q = searchParams.get('q')
    const tags = searchParams.get('tags')
    const models = searchParams.get('models')
    const isOfficial = searchParams.get('isOfficial')

    const where: any = {
      status: 'published',
    }

    if (category) {
      where.category = category
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (tags) {
      const tagArray = tags.split(',')
      where.tags = { hasSome: tagArray }
    }

    if (models) {
      const modelArray = models.split(',')
      where.applicableModels = { hasSome: modelArray }
    }

    if (isOfficial === 'true') {
      where.isOfficial = true
    }

    let orderBy: any = {}
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'popular':
      default:
        orderBy = { downloadCount: 'desc' }
    }

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          tags: true,
          rating: true,
          ratingCount: true,
          downloadCount: true,
          isOfficial: true,
          applicableModels: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.template.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      content, 
      description, 
      category, 
      subCategory, 
      tags, 
      exampleInput, 
      exampleOutput, 
      variables, 
      applicableModels,
      status,
    } = body

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Title, content, and category are required' }, { status: 400 })
    }

    const template = await prisma.template.create({
      data: {
        userId: session.user.id,
        title,
        content,
        description,
        category,
        subCategory,
        tags: tags || [],
        exampleInput,
        exampleOutput,
        variables: variables || [],
        applicableModels: applicableModels || [],
        status: status || 'draft',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
