import { BlockQueries } from '@/lib/db/queries/blocks'
import { BlockCatalog } from '@/types/block'
import { RARITY_WEIGHTS, DAILY_BLOCKS_COUNT } from '@/lib/constants'

export class BlockService {
  static async selectDailyBlocks(): Promise<string[]> {
    // Get all blocks from catalog
    const allBlocks = await BlockQueries.getAllBlocks()
    
    if (allBlocks.length === 0) {
      throw new Error('No blocks in catalog')
    }

    // Create weighted array
    const weightedBlocks: BlockCatalog[] = []
    
    for (const block of allBlocks) {
      const weight = RARITY_WEIGHTS[block.rarity] || 1
      for (let i = 0; i < weight; i++) {
        weightedBlocks.push(block)
      }
    }

    // Randomly select blocks
    const selectedBlocks: string[] = []
    
    for (let i = 0; i < DAILY_BLOCKS_COUNT; i++) {
      const randomIndex = Math.floor(Math.random() * weightedBlocks.length)
      selectedBlocks.push(weightedBlocks[randomIndex]._key)
    }

    return selectedBlocks
  }

  static async getTodaysDailyBlocks(): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // Check if today's selection exists
    let selection = await BlockQueries.getDailySelection(today)
    
    if (!selection) {
      // Create new selection
      const selectedBlocks = await this.selectDailyBlocks()
      await BlockQueries.saveDailySelection(today, selectedBlocks)
      return selectedBlocks
    }
    
    return selection.selectedBlocks
  }

  static async getAllBlocksFromCatalog(): Promise<BlockCatalog[]> {
    return BlockQueries.getAllBlocks()
  }

  static async getBlocksByKeys(keys: string[]): Promise<BlockCatalog[]> {
    return BlockQueries.getBlocksByKeys(keys)
  }
}
