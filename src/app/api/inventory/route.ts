import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { InventoryService } from '@/services/InventoryService'

export async function GET() {
  try {
    const user = await requireAuth()

    const inventory = await InventoryService.getInventory(user.id)

    return NextResponse.json({
      success: true,
      data: inventory,
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
    const { blockKey, quantity } = body

    if (!blockKey) {
      return NextResponse.json(
        { success: false, error: 'Block key is required' },
        { status: 400 }
      )
    }

    await InventoryService.addBlockToInventory(user.id, blockKey, quantity || 1)

    return NextResponse.json({
      success: true,
      data: { message: 'Block added to inventory' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
