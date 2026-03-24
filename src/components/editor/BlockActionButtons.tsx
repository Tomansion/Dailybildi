'use client'

import { RotateCw, FlipHorizontal2, FlipVertical2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BlockActionButtonsProps {
  onRotate: () => void
  onFlipHorizontal: () => void
  onFlipVertical: () => void
  onDiscard: () => void
}

export function BlockActionButtons({
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  onDiscard,
}: BlockActionButtonsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2 bg-card border border-border rounded-lg p-2 shadow-lg">
      <Button
        onClick={onRotate}
        size="icon"
        variant="secondary"
        title="Rotate 90°"
      >
        <RotateCw className="h-5 w-5" />
      </Button>
      <Button
        onClick={onFlipHorizontal}
        size="icon"
        variant="secondary"
        title="Flip Horizontal"
      >
        <FlipHorizontal2 className="h-5 w-5" />
      </Button>
      <Button
        onClick={onFlipVertical}
        size="icon"
        variant="secondary"
        title="Flip Vertical"
      >
        <FlipVertical2 className="h-5 w-5" />
      </Button>
      <Button
        onClick={onDiscard}
        size="icon"
        variant="destructive"
        title="Discard"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  )
}
