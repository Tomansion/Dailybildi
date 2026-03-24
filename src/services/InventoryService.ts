import { InventoryQueries } from '@/lib/db/queries/inventory'
import { BlockQueries } from '@/lib/db/queries/blocks'
import { WorldQueries } from '@/lib/db/queries/worlds'
import { UserQueries } from '@/lib/db/queries/users'
import { InventoryBlock, InventoryBlockWithData } from '@/types/inventory'
import { INITIAL_BLOCKS_COUNT, UNIVERSE_ID, RARITY_WEIGHTS } from '@/lib/constants'
import { BlockCatalog } from '@/types/block'

export class InventoryService {
  static async initializeUserInventory(userId: string): Promise<void> {
    // Check if inventory already exists
    const existing = await InventoryQueries.getInventory(userId)
    if (existing) {
      return
    }

    // Create inventory
    await InventoryQueries.createInventory(userId)

    // Create world for user
    await WorldQueries.createWorld(userId, UNIVERSE_ID)

    // Check if user has received initial blocks
    const user = await UserQueries.findById(userId)
    if (!user || user.receivedInitialBlocks) {
      return
    }

    // Give initial blocks
    await this.giveInitialBlocks(userId)
    await UserQueries.markInitialBlocksReceived(userId)
  }

  static async giveInitialBlocks(userId: string): Promise<void> {
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
    
    // Select 30 random blocks
    const selectedBlockKeys: string[] = []
    for (let i = 0; i < INITIAL_BLOCKS_COUNT; i++) {
      const randomIndex = Math.floor(Math.random() * weightedBlocks.length)
      selectedBlockKeys.push(weightedBlocks[randomIndex]._key)
    }

    // Count quantities
    const blockCounts = new Map<string, number>()
    for (const key of selectedBlockKeys) {
      blockCounts.set(key, (blockCounts.get(key) || 0) + 1)
    }

    // Create inventory blocks
    const inventoryBlocks: InventoryBlock[] = Array.from(blockCounts.entries()).map(
      ([key, quantity]) => ({
        blockCatalogKey: key,
        quantity,
        acquiredDate: new Date().toISOString(),
      })
    )

    await InventoryQueries.addBlocks(userId, inventoryBlocks)
  }

  static async addDailyBlocksToInventory(userId: string, blockKeys: string[]): Promise<void> {
    // Count quantities
    const blockCounts = new Map<string, number>()
    for (const key of blockKeys) {
      blockCounts.set(key, (blockCounts.get(key) || 0) + 1)
    }

    // Create inventory blocks
    const inventoryBlocks: InventoryBlock[] = Array.from(blockCounts.entries()).map(
      ([key, quantity]) => ({
        blockCatalogKey: key,
        quantity,
        acquiredDate: new Date().toISOString(),
      })
    )

    await InventoryQueries.addBlocks(userId, inventoryBlocks)
  }

  static async getInventory(userId: string): Promise<InventoryBlockWithData[]> {
    return InventoryQueries.getInventoryWithBlockData(userId)
  }

  static async removeBlockFromInventory(userId: string, blockKey: string, quantity: number = 1): Promise<void> {
    await InventoryQueries.removeBlock(userId, blockKey, quantity)
  }

  static async addBlockToInventory(userId: string, blockKey: string, quantity: number = 1): Promise<void> {
    const inventoryBlocks: InventoryBlock[] = [{
      blockCatalogKey: blockKey,
      quantity,
      acquiredDate: new Date().toISOString(),
    }]
    
    await InventoryQueries.addBlocks(userId, inventoryBlocks)
  }
}
