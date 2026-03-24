import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { WorldService } from '@/services/WorldService'

export async function GET(
  request: Request,
  { params }: { params: { worldId: string } }
) {
  try {
    await requireAuth()

    const world = await WorldService.getWorldById(params.worldId)
    
    if (!world) {
      return NextResponse.json(
        { success: false, error: 'World not found' },
        { status: 404 }
      )
    }

    const placedBlocks = await WorldService.getPlacedBlocks(params.worldId)

    return NextResponse.json({
      success: true,
      data: {
        world,
        placedBlocks,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    )
  }
}
