import ArangoDBClient from '../arango'
import { COLLECTIONS } from '../collections'
import { World, PlacedBlock, PlacedBlockWithData, WorldWithBlocks } from '@/types/world'

export class WorldQueries {
  static async createWorld(userId: string, universeId: string): Promise<World> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.WORLDS)
    
    const now = new Date().toISOString()
    const world: World = {
      _key: `world_${userId}`,
      userId,
      universeId,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
    }
    
    await collection.save(world)
    return world
  }

  static async getWorldByUserId(userId: string): Promise<World | null> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR world IN ${COLLECTIONS.WORLDS}
        FILTER world.userId == @userId
        LIMIT 1
        RETURN world
    `, { userId })
    
    const results = await cursor.all()
    return results[0] || null
  }

  static async getWorldById(worldId: string): Promise<World | null> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.WORLDS)
    
    try {
      const world = await collection.document(worldId)
      return world as World
    } catch {
      return null
    }
  }

  static async updateWorldTimestamp(worldId: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.WORLDS)
    
    await collection.update(worldId, {
      updatedAt: new Date().toISOString(),
    })
  }

  static async getPlacedBlocks(worldId: string): Promise<PlacedBlockWithData[]> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR placed IN ${COLLECTIONS.PLACED_BLOCKS}
        FILTER placed.worldId == @worldId
        LET block = DOCUMENT(${COLLECTIONS.BLOCK_CATALOG}, placed.blockCatalogKey)
        SORT placed.zOrder ASC, block.layer ASC
        RETURN {
          _key: placed._key,
          worldId: placed.worldId,
          blockCatalogKey: placed.blockCatalogKey,
          gridX: placed.gridX,
          gridY: placed.gridY,
          rotation: placed.rotation,
          flipX: placed.flipX,
          flipY: placed.flipY,
          zOrder: placed.zOrder,
          placedAt: placed.placedAt,
          blockData: {
            id: block.blockId,
            layer: block.layer,
            rarity: block.rarity,
            imagePath: block.imagePath
          }
        }
    `, { worldId })
    
    return await cursor.all()
  }

  static async savePlacedBlock(placedBlock: Omit<PlacedBlock, '_key'>): Promise<PlacedBlock> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.PLACED_BLOCKS)
    
    const result = await collection.save(placedBlock)
    
    // Update world timestamp
    await this.updateWorldTimestamp(placedBlock.worldId)
    
    return {
      _key: result._key,
      ...placedBlock,
    }
  }

  static async updatePlacedBlock(
    blockKey: string,
    updates: Partial<Omit<PlacedBlock, '_key' | 'worldId' | 'blockCatalogKey' | 'placedAt'>>
  ): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.PLACED_BLOCKS)
    
    const block = await collection.document(blockKey)
    await collection.update(blockKey, updates)
    
    // Update world timestamp
    await this.updateWorldTimestamp(block.worldId)
  }

  static async deletePlacedBlock(blockKey: string): Promise<string> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.PLACED_BLOCKS)
    
    const block = await collection.document(blockKey) as PlacedBlock
    await collection.remove(blockKey)
    
    // Update world timestamp
    await this.updateWorldTimestamp(block.worldId)
    
    return block.blockCatalogKey
  }

  static async getWorldsForCommunity(
    sortBy: 'likes' | 'recent',
    limit: number = 20,
    offset: number = 0
  ): Promise<WorldWithBlocks[]> {
    const db = ArangoDBClient.getClient()
    
    const sortField = sortBy === 'likes' ? 'world.likeCount DESC' : 'world.updatedAt DESC'
    
    const cursor = await db.query(`
      FOR world IN ${COLLECTIONS.WORLDS}
        SORT ${sortField}
        LIMIT @offset, @limit
        LET user = DOCUMENT(${COLLECTIONS.USERS}, world.userId)
        LET placedBlocks = (
          FOR placed IN ${COLLECTIONS.PLACED_BLOCKS}
            FILTER placed.worldId == world._key
            LET block = DOCUMENT(${COLLECTIONS.BLOCK_CATALOG}, placed.blockCatalogKey)
            SORT placed.zOrder ASC, block.layer ASC
            RETURN {
              _key: placed._key,
              worldId: placed.worldId,
              blockCatalogKey: placed.blockCatalogKey,
              gridX: placed.gridX,
              gridY: placed.gridY,
              rotation: placed.rotation,
              flipX: placed.flipX,
              flipY: placed.flipY,
              zOrder: placed.zOrder,
              placedAt: placed.placedAt,
              blockData: {
                id: block.blockId,
                layer: block.layer,
                rarity: block.rarity,
                imagePath: block.imagePath
              }
            }
        )
        RETURN {
          _key: world._key,
          userId: world.userId,
          universeId: world.universeId,
          createdAt: world.createdAt,
          updatedAt: world.updatedAt,
          likeCount: world.likeCount,
          username: user.username,
          placedBlocks: placedBlocks
        }
    `, { offset, limit })
    
    return await cursor.all()
  }

  static async incrementLikeCount(worldId: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.WORLDS)
    
    const world = await collection.document(worldId) as World
    await collection.update(worldId, {
      likeCount: world.likeCount + 1,
    })
  }

  static async decrementLikeCount(worldId: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.WORLDS)
    
    const world = await collection.document(worldId) as World
    await collection.update(worldId, {
      likeCount: Math.max(0, world.likeCount - 1),
    })
  }
}
