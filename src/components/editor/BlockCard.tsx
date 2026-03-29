'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface BlockCardProps {
  imagePath: string
  quantity: number
  blockKey: string
  blockData: { id: string; layer: number; rarity: number }
  isSelected: boolean
  onClick: () => void
  backgroundColor?: string
}

// Utility function to darken a hex color for visual effect
const darkenColor = (color: string): string => {
  const hex = color.replace('#', '')
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 50)
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 50)
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 50)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function BlockCard({
  imagePath,
  quantity,
  blockKey,
  blockData,
  isSelected,
  onClick,
  backgroundColor,
}: BlockCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent click from bubbling to canvas
    onClick()
  }

  const handleDragStart = (e: React.DragEvent) => {
    // Store block data in drag event
    const dragData = {
      blockCatalogKey: blockKey,
      imagePath,
      id: blockData.id,
      layer: blockData.layer,
      rarity: blockData.rarity,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const darkenedBg = backgroundColor ? darkenColor(backgroundColor) : undefined

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary relative",
        isSelected && "border-primary border-2 shadow-lg"
      )}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      style={darkenedBg ? { backgroundColor: darkenedBg } : undefined}
    >
      <CardContent className="p-3">
        <div className="relative w-16 h-16 mx-auto">
          <img
            src={imagePath}
            alt={`Block ${blockData.id}`}
            className="w-full h-full object-contain pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
          {quantity > 1 && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0"
            >
              {quantity}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
