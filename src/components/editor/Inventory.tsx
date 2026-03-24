'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { BlockCard } from './BlockCard'
import { InventoryBlockWithData } from '@/types/inventory'

interface InventoryProps {
  blocks: InventoryBlockWithData[]
  selectedBlockKey: string | null
  onBlockSelect: (block: InventoryBlockWithData) => void
}

export function Inventory({ blocks, selectedBlockKey, onBlockSelect }: InventoryProps) {
  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          {blocks.reduce((sum, b) => sum + b.quantity, 0)} blocks
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-3">
          {blocks.length === 0 && (
            <div className="col-span-2 text-center text-muted-foreground text-sm py-8">
              No blocks available
            </div>
          )}
          {blocks.map((block) => (
            <BlockCard
              key={block.blockCatalogKey}
              imagePath={block.blockData.imagePath}
              quantity={block.quantity}
              blockKey={block.blockCatalogKey}
              blockData={block.blockData}
              isSelected={selectedBlockKey === block.blockCatalogKey}
              onClick={() => onBlockSelect(block)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
