import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { WorldService } from '@/services/WorldService'
import { InventoryService } from '@/services/InventoryService'

export async function GET() {
  try {
    const user = await requireAuth()

    const world = await WorldService.getUserWorld(user.id)
    
    if (!world) {
      return NextResponse.json(
        { success: false, error: 'World not found' },
        { status: 404 }
      )
    }

    const placedBlocks = await WorldService.getPlacedBlocks(world._key)

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

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { blockCatalogKey, gridX, gridY, zOrder } = body

    if (!blockCatalogKey || gridX === undefined || gridY === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const world = await WorldService.getUserWorld(user.id)
    
    if (!world) {
      return NextResponse.json(
        { success: false, error: 'World not found' },
        { status: 404 }
      )
    }

    // Place block
    const placedBlock = await WorldService.placeBlock(
      world._key,
      blockCatalogKey,
      gridX,
      gridY,
      zOrder || 0
    )

    // Remove from inventory
    await InventoryService.removeBlockFromInventory(user.id, blockCatalogKey, 1)

    return NextResponse.json({
      success: true,
      data: placedBlock,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
