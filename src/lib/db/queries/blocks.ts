import ArangoDBClient from '../arango'
import { COLLECTIONS } from '../collections'
import { BlockCatalog, DailyBlockSelection } from '@/types/block'

export class BlockQueries {
  static async getAllBlocks(): Promise<BlockCatalog[]> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR block IN ${COLLECTIONS.BLOCK_CATALOG}
        SORT block.layer ASC, block.rarity ASC
        RETURN block
    `)
    
    return await cursor.all()
  }

  static async getBlocksByKeys(blockKeys: string[]): Promise<BlockCatalog[]> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR block IN ${COLLECTIONS.BLOCK_CATALOG}
        FILTER block._key IN @blockKeys
        RETURN block
    `, { blockKeys })
    
    return await cursor.all()
  }

  static async getBlockByKey(blockKey: string): Promise<BlockCatalog | null> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.BLOCK_CATALOG)
    
    try {
      const block = await collection.document(blockKey)
      return block as BlockCatalog
    } catch {
      return null
    }
  }

  static async saveDailySelection(date: string, selectedBlocks: string[]): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.DAILY_BLOCK_SELECTIONS)
    
    const selection: DailyBlockSelection = {
      _key: date,
      date,
      selectedBlocks,
      createdAt: new Date().toISOString(),
    }
    
    await collection.save(selection)
  }

  static async getDailySelection(date: string): Promise<DailyBlockSelection | null> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.DAILY_BLOCK_SELECTIONS)
    
    try {
      const selection = await collection.document(date)
      return selection as DailyBlockSelection
    } catch {
      return null
    }
  }

  static async getLatestDailySelection(): Promise<DailyBlockSelection | null> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR selection IN ${COLLECTIONS.DAILY_BLOCK_SELECTIONS}
        SORT selection.date DESC
        LIMIT 1
        RETURN selection
    `)
    
    const results = await cursor.all()
    return results[0] || null
  }
}
