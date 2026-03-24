import prisma from '../prisma'
import { World, PlacedBlock, PlacedBlockWithData, WorldWithBlocks } from '@/types/world'

export class WorldQueries {
  static async createWorld(userId: string, universeId: string): Promise<World> {
    const world = await prisma.world.create({
      data: {
        userId,
        universeId,
      },
    })
    
    return {
      _key: world.id,
      userId: world.userId,
      universeId: world.universeId,
      createdAt: world.createdAt.toISOString(),
      updatedAt: world.updatedAt.toISOString(),
      likeCount: world.likeCount,
    }
  }

  static async getWorldByUserId(userId: string): Promise<World | null> {
    const world = await prisma.world.findFirst({
      where: { userId },
    })
    
    if (!world) return null
    
    return {
      _key: world.id,
      userId: world.userId,
      universeId: world.universeId,
      createdAt: world.createdAt.toISOString(),
      updatedAt: world.updatedAt.toISOString(),
      likeCount: world.likeCount,
    }
  }

  static async getWorldById(worldId: string): Promise<World | null> {
    const world = await prisma.world.findUnique({
      where: { id: worldId },
    })
    
    if (!world) return null
    
    return {
      _key: world.id,
      userId: world.userId,
      universeId: world.universeId,
      createdAt: world.createdAt.toISOString(),
      updatedAt: world.updatedAt.toISOString(),
      likeCount: world.likeCount,
    }
  }

  static async updateWorldTimestamp(worldId: string): Promise<void> {
    await prisma.world.update({
      where: { id: worldId },
      data: { updatedAt: new Date() },
    })
  }

  static async getPlacedBlocks(worldId: string): Promise<PlacedBlockWithData[]> {
    const placedBlocks = await prisma.placedBlock.findMany({
      where: { worldId },
      include: {
        blockCatalog: true,
      },
      orderBy: [
        { zOrder: 'asc' },
        { blockCatalog: { layer: 'asc' } },
      ],
    })
    
    return placedBlocks.map(placed => ({
      _key: placed.id,
      worldId: placed.worldId,
      blockCatalogKey: placed.blockCatalogId,
      gridX: placed.gridX,
      gridY: placed.gridY,
      rotation: placed.rotation,
      flipX: placed.flipX,
      flipY: placed.flipY,
      zOrder: placed.zOrder,
      placedAt: placed.placedAt.toISOString(),
      blockData: {
        id: placed.blockCatalog.blockId,
        layer: placed.blockCatalog.layer,
        rarity: placed.blockCatalog.rarity,
        imagePath: placed.blockCatalog.imagePath,
      },
    }))
  }

  static async savePlacedBlock(placedBlock: Omit<PlacedBlock, '_key'>): Promise<PlacedBlock> {
    const created = await prisma.placedBlock.create({
      data: {
        worldId: placedBlock.worldId,
        blockCatalogId: placedBlock.blockCatalogKey,
        gridX: placedBlock.gridX,
        gridY: placedBlock.gridY,
        rotation: placedBlock.rotation,
        flipX: placedBlock.flipX,
        flipY: placedBlock.flipY,
        zOrder: placedBlock.zOrder,
        placedAt: new Date(placedBlock.placedAt),
      },
    })
    
    // Update world timestamp
    await this.updateWorldTimestamp(placedBlock.worldId)
    
    return {
      _key: created.id,
      worldId: created.worldId,
      blockCatalogKey: created.blockCatalogId,
      gridX: created.gridX,
      gridY: created.gridY,
      rotation: created.rotation,
      flipX: created.flipX,
      flipY: created.flipY,
      zOrder: created.zOrder,
      placedAt: created.placedAt.toISOString(),
    }
  }

  static async updatePlacedBlock(
    blockKey: string,
    updates: Partial<Omit<PlacedBlock, '_key' | 'worldId' | 'blockCatalogKey' | 'placedAt'>>
  ): Promise<void> {
    const block = await prisma.placedBlock.findUnique({
      where: { id: blockKey },
    })
    
    if (!block) return
    
    await prisma.placedBlock.update({
      where: { id: blockKey },
      data: updates,
    })
    
    // Update world timestamp
    await this.updateWorldTimestamp(block.worldId)
  }

  static async deletePlacedBlock(blockKey: string): Promise<string> {
    const block = await prisma.placedBlock.findUnique({
      where: { id: blockKey },
    })
    
    if (!block) throw new Error('Block not found')
    
    await prisma.placedBlock.delete({
      where: { id: blockKey },
    })
    
    // Update world timestamp
    await this.updateWorldTimestamp(block.worldId)
    
    return block.blockCatalogId
  }

  static async getWorldsForCommunity(
    sortBy: 'likes' | 'recent',
    limit: number = 20,
    offset: number = 0
  ): Promise<WorldWithBlocks[]> {
    const orderBy = sortBy === 'likes' 
      ? { likeCount: 'desc' as const }
      : { updatedAt: 'desc' as const }
    
    const worlds = await prisma.world.findMany({
      orderBy,
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            username: true,
          },
        },
        placedBlocks: {
          include: {
            blockCatalog: true,
          },
          orderBy: [
            { zOrder: 'asc' },
            { blockCatalog: { layer: 'asc' } },
          ],
        },
      },
    })
    
    return worlds.map(world => ({
      _key: world.id,
      userId: world.userId,
      universeId: world.universeId,
      createdAt: world.createdAt.toISOString(),
      updatedAt: world.updatedAt.toISOString(),
      likeCount: world.likeCount,
      username: world.user.username,
      placedBlocks: world.placedBlocks.map(placed => ({
        _key: placed.id,
        worldId: placed.worldId,
        blockCatalogKey: placed.blockCatalogId,
        gridX: placed.gridX,
        gridY: placed.gridY,
        rotation: placed.rotation,
        flipX: placed.flipX,
        flipY: placed.flipY,
        zOrder: placed.zOrder,
        placedAt: placed.placedAt.toISOString(),
        blockData: {
          id: placed.blockCatalog.blockId,
          layer: placed.blockCatalog.layer,
          rarity: placed.blockCatalog.rarity,
          imagePath: placed.blockCatalog.imagePath,
        },
      })),
    }))
  }

  static async incrementLikeCount(worldId: string): Promise<void> {
    await prisma.world.update({
      where: { id: worldId },
      data: {
        likeCount: { increment: 1 },
      },
    })
  }

  static async decrementLikeCount(worldId: string): Promise<void> {
    await prisma.world.update({
      where: { id: worldId },
      data: {
        likeCount: { decrement: 1 },
      },
    })
  }
}
