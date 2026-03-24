import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { WorldService } from '@/services/WorldService'
import { InventoryService } from '@/services/InventoryService'

export async function PATCH(
  request: Request,
  { params }: { params: { blockId: string } }
) {
  try {
    await requireAuth()
    const body = await request.json()
    const { gridX, gridY, rotation, flipX, flipY, zOrder } = body

    if (gridX !== undefined && gridY !== undefined) {
      await WorldService.updateBlockPosition(params.blockId, gridX, gridY)
    }

    if (rotation !== undefined || flipX !== undefined || flipY !== undefined) {
      await WorldService.updateBlockTransform(params.blockId, rotation, flipX, flipY)
    }

    if (zOrder !== undefined) {
      await WorldService.updateBlockZOrder(params.blockId, zOrder)
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Block updated' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { blockId: string } }
) {
  try {
    const user = await requireAuth()

    // Remove block and get its catalog key
    const blockCatalogKey = await WorldService.removeBlock(params.blockId)

    // Return to inventory
    await InventoryService.addBlockToInventory(user.id, blockCatalogKey, 1)

    return NextResponse.json({
      success: true,
      data: { message: 'Block removed and returned to inventory' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
