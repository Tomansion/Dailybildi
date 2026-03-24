export interface InventoryBlock {
  blockCatalogKey: string
  quantity: number
  acquiredDate: string
}

export interface UserInventory {
  _key: string
  userId: string
  blocks: InventoryBlock[]
  updatedAt: string
}

export interface InventoryBlockWithData extends InventoryBlock {
  blockData: {
    id: string
    layer: number
    rarity: number
    imagePath: string
  }
}
