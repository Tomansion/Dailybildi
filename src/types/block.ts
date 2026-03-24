export interface BlockCatalog {
  _key: string
  blockId: string
  layer: number
  rarity: number
  universeId: string
  imagePath: string
}

export interface DailyBlockSelection {
  _key: string
  date: string
  selectedBlocks: string[] // Array of BlockCatalog _keys
  createdAt: string
}

export interface BlockData {
  id: string
  layer: number
  rarity: number
  imagePath: string
}
