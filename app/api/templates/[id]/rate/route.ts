import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { rating } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const existingRating = await prisma.templateRating.findUnique({
      where: {
        templateId_userId: {
          templateId: id,
          userId: session.user.id,
        },
      },
    })

    if (existingRating) {
      await prisma.templateRating.update({
        where: { id: existingRating.id },
        data: { rating },
      })
    } else {
      await prisma.templateRating.create({
        data: {
          templateId: id,
          userId: session.user.id,
          rating,
        },
      })
    }

    const agg = await prisma.templateRating.aggregate({
      where: { templateId: id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await prisma.template.update({
      where: { id },
      data: {
        rating: agg._avg.rating || 0,
        ratingCount: agg._count.rating,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rating template:', error)
    return NextResponse.json({ error: 'Failed to rate template' }, { status: 500 })
  }
}
