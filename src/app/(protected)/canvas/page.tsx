'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR, { mutate } from 'swr'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Inventory } from '@/components/editor/Inventory'
import { HomeButton } from '@/components/editor/HomeButton'
import { BlockActionButtons } from '@/components/editor/BlockActionButtons'
import { InventoryBlockWithData } from '@/types/inventory'
import { PlacedBlockWithData } from '@/types/world'
import { useRouter } from 'next/navigation'

// Lazy load PhaserCanvas
const PhaserCanvas = dynamic(
  () => import('@/components/editor/PhaserCanvas').then((mod) => ({
    default: mod.PhaserCanvas,
  })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-muted-foreground">Loading canvas...</p>
      </div>
    ),
  }
)

import dynamic from 'next/dynamic'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CanvasPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null)
  const [selectedPlacedBlockKey, setSelectedPlacedBlockKey] = useState<string | null>(null)
  const [selectedBlockForPlacement, setSelectedBlockForPlacement] = useState<any>(null)

  // Fetch inventory
  const { data: inventoryData } = useSWR('/api/inventory', fetcher, {
    refreshInterval: 5000,
  })

  // Fetch world and placed blocks
  const { data: worldData } = useSWR('/api/world', fetcher, {
    refreshInterval: 5000,
  })

  // Fetch block catalog
  const { data: catalogData } = useSWR('/api/blocks/catalog', fetcher)

  const inventory: InventoryBlockWithData[] = inventoryData?.data || []
  const placedBlocks: PlacedBlockWithData[] = worldData?.data?.placedBlocks || []
  const blockImages = catalogData?.data || []

  const handleBlockSelect = (block: InventoryBlockWithData) => {
    setSelectedBlockKey(block.blockCatalogKey)
    setSelectedBlockForPlacement({
      imagePath: block.blockData.imagePath,
      blockCatalogKey: block.blockCatalogKey,
      id: block.blockData.id,
      layer: block.blockData.layer,
      rarity: block.blockData.rarity,
    })
  }

  const handleBlockPlaced = async (blockCatalogKey: string, gridX: number, gridY: number) => {
    try {
      const response = await fetch('/api/world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockCatalogKey, gridX, gridY, zOrder: 0 }),
      })

      if (response.ok) {
        // Refresh data
        mutate('/api/world')
        mutate('/api/inventory')
        setSelectedBlockKey(null)
        setSelectedBlockForPlacement(null)
      }
    } catch (error) {
      console.error('Failed to place block:', error)
    }
  }

  const handleBlockUpdated = async (blockKey: string, updates: any) => {
    try {
      await fetch(`/api/world/blocks/${blockKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      mutate('/api/world')
    } catch (error) {
      console.error('Failed to update block:', error)
    }
  }

  const handleBlockSelected = (blockKey: string) => {
    setSelectedPlacedBlockKey(blockKey)
  }

  const handleHomeClick = () => {
    const scene = (containerRef.current as any)?.__phaserScene
    if (scene) {
      scene.goHome()
    }
  }

  const handleRotate = () => {
    const scene = (containerRef.current as any)?.__phaserScene
    if (scene) {
      scene.rotateSelectedBlock()
    }
  }

  const handleFlipHorizontal = () => {
    const scene = (containerRef.current as any)?.__phaserScene
    if (scene) {
      scene.flipSelectedBlockHorizontal()
    }
  }

  const handleFlipVertical = () => {
    const scene = (containerRef.current as any)?.__phaserScene
    if (scene) {
      scene.flipSelectedBlockVertical()
    }
  }

  const handleDiscard = async () => {
    const scene = (containerRef.current as any)?.__phaserScene
    if (scene && selectedPlacedBlockKey) {
      try {
        await fetch(`/api/world/blocks/${selectedPlacedBlockKey}`, {
          method: 'DELETE',
        })
        scene.removeSelectedBlock()
        setSelectedPlacedBlockKey(null)
        mutate('/api/world')
        mutate('/api/inventory')
      } catch (error) {
        console.error('Failed to discard block:', error)
      }
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      {/* Inventory Panel */}
      <div className="flex-shrink-0">
        <Inventory
          blocks={inventory}
          onBlockSelect={handleBlockSelect}
          selectedBlockKey={selectedBlockKey}
        />
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative" ref={containerRef}>
        <PhaserCanvas
          placedBlocks={placedBlocks}
          blockImages={blockImages}
          onBlockPlaced={handleBlockPlaced}
          onBlockUpdated={handleBlockUpdated}
          onBlockSelected={handleBlockSelected}
          selectedBlockForPlacement={selectedBlockForPlacement}
        />

        {/* Home Button */}
        <div className="absolute top-4 right-4">
          <HomeButton onClick={handleHomeClick} />
        </div>

        {/* Community Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/community')}
          >
            <Users className="w-4 h-4 mr-2" />
            Community
          </Button>
        </div>

        {/* Block Action Buttons (show when block is selected) */}
        {selectedPlacedBlockKey && (
          <BlockActionButtons
            onRotate={handleRotate}
            onFlipHorizontal={handleFlipHorizontal}
            onFlipVertical={handleFlipVertical}
            onDiscard={handleDiscard}
          />
        )}
      </div>
    </div>
  )
}
