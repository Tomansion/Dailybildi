import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { BlockService } from '@/services/BlockService'

export async function GET() {
  try {
    await requireAuth()

    const dailyBlocks = await BlockService.getTodaysDailyBlocks()
    const blocks = await BlockService.getBlocksByKeys(dailyBlocks)

    return NextResponse.json({
      success: true,
      data: blocks.map(b => ({
        id: b.blockId,
        layer: b.layer,
        rarity: b.rarity,
        imagePath: b.imagePath,
        key: b._key,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    )
  }
}
