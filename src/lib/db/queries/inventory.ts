import ArangoDBClient from '../arango'
import { COLLECTIONS } from '../collections'
import { UserInventory, InventoryBlock, InventoryBlockWithData } from '@/types/inventory'

export class InventoryQueries {
  static async createInventory(userId: string): Promise<UserInventory> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.USER_INVENTORIES)
    
    const inventory: UserInventory = {
      _key: `inventory_${userId}`,
      userId,
      blocks: [],
      updatedAt: new Date().toISOString(),
    }
    
    await collection.save(inventory)
    return inventory
  }

  static async getInventory(userId: string): Promise<UserInventory | null> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR inv IN ${COLLECTIONS.USER_INVENTORIES}
        FILTER inv.userId == @userId
        LIMIT 1
        RETURN inv
    `, { userId })
    
    const results = await cursor.all()
    return results[0] || null
  }

  static async getInventoryWithBlockData(userId: string): Promise<InventoryBlockWithData[]> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR inv IN ${COLLECTIONS.USER_INVENTORIES}
        FILTER inv.userId == @userId
        LIMIT 1
        FOR invBlock IN inv.blocks
          LET block = DOCUMENT(${COLLECTIONS.BLOCK_CATALOG}, invBlock.blockCatalogKey)
          RETURN {
            blockCatalogKey: invBlock.blockCatalogKey,
            quantity: invBlock.quantity,
            acquiredDate: invBlock.acquiredDate,
            blockData: {
              id: block.blockId,
              layer: block.layer,
              rarity: block.rarity,
              imagePath: block.imagePath
            }
          }
    `, { userId })
    
    return await cursor.all()
  }

  static async addBlocks(userId: string, blocks: InventoryBlock[]): Promise<void> {
    const db = ArangoDBClient.getClient()
    
    // Get current inventory
    const inventory = await this.getInventory(userId)
    if (!inventory) {
      throw new Error('Inventory not found')
    }

    // Merge blocks (add quantities if block already exists)
    const updatedBlocks = [...inventory.blocks]
    
    for (const newBlock of blocks) {
      const existingIndex = updatedBlocks.findIndex(
        b => b.blockCatalogKey === newBlock.blockCatalogKey
      )
      
      if (existingIndex >= 0) {
        updatedBlocks[existingIndex].quantity += newBlock.quantity
      } else {
        updatedBlocks.push(newBlock)
      }
    }

    // Update inventory
    const collection = db.collection(COLLECTIONS.USER_INVENTORIES)
    await collection.update(inventory._key, {
      blocks: updatedBlocks,
      updatedAt: new Date().toISOString(),
    })
  }

  static async removeBlock(userId: string, blockCatalogKey: string, quantity: number = 1): Promise<void> {
    const db = ArangoDBClient.getClient()
    
    const inventory = await this.getInventory(userId)
    if (!inventory) {
      throw new Error('Inventory not found')
    }

    const updatedBlocks = inventory.blocks
      .map(b => {
        if (b.blockCatalogKey === blockCatalogKey) {
          return {
            ...b,
            quantity: b.quantity - quantity,
          }
        }
        return b
      })
      .filter(b => b.quantity > 0)

    const collection = db.collection(COLLECTIONS.USER_INVENTORIES)
    await collection.update(inventory._key, {
      blocks: updatedBlocks,
      updatedAt: new Date().toISOString(),
    })
  }

  static async clearInventory(userId: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    
    const inventory = await this.getInventory(userId)
    if (!inventory) {
      return
    }

    const collection = db.collection(COLLECTIONS.USER_INVENTORIES)
    await collection.update(inventory._key, {
      blocks: [],
      updatedAt: new Date().toISOString(),
    })
  }
}
