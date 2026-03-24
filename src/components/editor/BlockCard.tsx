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
}

export function BlockCard({
  imagePath,
  quantity,
  blockKey,
  blockData,
  isSelected,
  onClick,
}: BlockCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent click from bubbling to canvas
    onClick()
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary relative",
        isSelected && "border-primary border-2 shadow-lg"
      )}
      onClick={handleClick}
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
