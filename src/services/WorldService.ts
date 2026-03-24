import { WorldQueries } from '@/lib/db/queries/worlds'
import { World, PlacedBlock, PlacedBlockWithData, WorldWithBlocks } from '@/types/world'

export class WorldService {
  static async getUserWorld(userId: string): Promise<World | null> {
    return WorldQueries.getWorldByUserId(userId)
  }

  static async getWorldById(worldId: string): Promise<World | null> {
    return WorldQueries.getWorldById(worldId)
  }

  static async getPlacedBlocks(worldId: string): Promise<PlacedBlockWithData[]> {
    return WorldQueries.getPlacedBlocks(worldId)
  }

  static async placeBlock(
    worldId: string,
    blockCatalogKey: string,
    gridX: number,
    gridY: number,
    zOrder: number
  ): Promise<PlacedBlock> {
    const placedBlock: Omit<PlacedBlock, '_key'> = {
      worldId,
      blockCatalogKey,
      gridX,
      gridY,
      rotation: 0,
      flipX: false,
      flipY: false,
      zOrder,
      placedAt: new Date().toISOString(),
    }

    return WorldQueries.savePlacedBlock(placedBlock)
  }

  static async updateBlockPosition(blockKey: string, gridX: number, gridY: number): Promise<void> {
    await WorldQueries.updatePlacedBlock(blockKey, { gridX, gridY })
  }

  static async updateBlockTransform(
    blockKey: string,
    rotation?: number,
    flipX?: boolean,
    flipY?: boolean
  ): Promise<void> {
    const updates: Record<string, any> = {}
    if (rotation !== undefined) updates.rotation = rotation
    if (flipX !== undefined) updates.flipX = flipX
    if (flipY !== undefined) updates.flipY = flipY

    await WorldQueries.updatePlacedBlock(blockKey, updates)
  }

  static async updateBlockZOrder(blockKey: string, zOrder: number): Promise<void> {
    await WorldQueries.updatePlacedBlock(blockKey, { zOrder })
  }

  static async removeBlock(blockKey: string): Promise<string> {
    return WorldQueries.deletePlacedBlock(blockKey)
  }

  static async getCommunityWorlds(sortBy: 'likes' | 'recent', page: number = 1, pageSize: number = 20): Promise<WorldWithBlocks[]> {
    const offset = (page - 1) * pageSize
    return WorldQueries.getWorldsForCommunity(sortBy, pageSize, offset)
  }
}
