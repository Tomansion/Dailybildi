import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { WorldService } from '@/services/WorldService'

export async function GET(request: Request) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const sortBy = (searchParams.get('sortBy') || 'recent') as 'likes' | 'recent'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const worlds = await WorldService.getCommunityWorlds(sortBy, page, pageSize)

    return NextResponse.json({
      success: true,
      data: worlds,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    )
  }
}
