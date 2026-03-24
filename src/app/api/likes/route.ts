import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { LikeService } from '@/services/LikeService'

export async function GET() {
  try {
    const user = await requireAuth()
    const likedWorlds = await LikeService.getUserLikedWorlds(user.id)

    return NextResponse.json({
      success: true,
      data: likedWorlds,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { worldId } = body

    if (!worldId) {
      return NextResponse.json(
        { success: false, error: 'World ID is required' },
        { status: 400 }
      )
    }

    await LikeService.likeWorld(user.id, worldId)

    return NextResponse.json({
      success: true,
      data: { message: 'World liked' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const worldId = searchParams.get('worldId')

    if (!worldId) {
      return NextResponse.json(
        { success: false, error: 'World ID is required' },
        { status: 400 }
      )
    }

    await LikeService.unlikeWorld(user.id, worldId)

    return NextResponse.json({
      success: true,
      data: { message: 'World unliked' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
