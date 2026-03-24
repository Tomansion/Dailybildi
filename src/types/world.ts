export interface World {
  _key: string
  userId: string
  universeId: string
  createdAt: string
  updatedAt: string
  likeCount: number
}

export interface PlacedBlock {
  _key: string
  worldId: string
  blockCatalogKey: string
  gridX: number
  gridY: number
  rotation: number // 0, 90, 180, 270
  flipX: boolean
  flipY: boolean
  zOrder: number
  placedAt: string
}

export interface PlacedBlockWithData extends PlacedBlock {
  blockData: {
    id: string
    layer: number
    rarity: number
    imagePath: string
  }
}

export interface WorldWithBlocks extends World {
  placedBlocks: PlacedBlockWithData[]
  username?: string
}
