'use client'

import { useEffect, useRef, useState } from 'react'

interface PhaserCanvasProps {
  placedBlocks: any[]
  blockImages: Array<{ id: string; layer: number; rarity: number; imagePath: string }>
  onBlockPlaced: (blockCatalogKey: string, gridX: number, gridY: number) => Promise<void>
  onBlockUpdated: (blockKey: string, updates: any) => Promise<void>
  onBlockSelected: (blockKey: string) => void
  selectedBlockForPlacement: { imagePath: string; blockCatalogKey: string; id: string; layer: number; rarity: number } | null
}

export function PhaserCanvas({
  placedBlocks,
  blockImages,
  onBlockPlaced,
  onBlockUpdated,
  onBlockSelected,
  selectedBlockForPlacement,
}: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize Phaser game
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) {
      return
    }

    // Prevent multiple initializations
    if (gameRef.current) {
      return
    }

    // Dynamic import Phaser only on client
    import('@/phaser/PhaserGame').then(({ PhaserGameWrapper }) => {
      // Double-check still needed after async import
      if (gameRef.current) {
        return
      }

      const game = new PhaserGameWrapper()
      game.initialize('phaser-container')
      gameRef.current = game

      // Wait for scene to be ready
      const checkScene = setInterval(() => {
        const scene = game.getMainScene()
        if (scene) {
          sceneRef.current = scene
          clearInterval(checkScene)
          setIsReady(true)

          // Setup callbacks
          scene.setOnBlockPlaced(async (blockKey: string, gridX: number, gridY: number) => {
            await onBlockPlaced(blockKey, gridX, gridY)
          })

          scene.setOnBlockUpdated(async (blockKey: string, updates: any) => {
            await onBlockUpdated(blockKey, updates)
          })

          scene.setOnBlockSelected((blockKey: string) => {
            onBlockSelected(blockKey)
          })
        }
      }, 100)

      return () => {
        clearInterval(checkScene)
      }
    })

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
        sceneRef.current = null
        setIsReady(false)
      }
    }
  }, [])

  // Load block images when ready
  useEffect(() => {
    if (isReady && sceneRef.current && blockImages.length > 0) {
      sceneRef.current.loadBlockImages(blockImages)
    }
  }, [isReady, blockImages])

  // Load placed blocks when ready
  useEffect(() => {
    if (isReady && sceneRef.current) {
      sceneRef.current.loadBlocks(placedBlocks)
    }
  }, [isReady, placedBlocks])

  // Handle block selection for placement
  useEffect(() => {
    if (isReady && sceneRef.current) {
      if (selectedBlockForPlacement) {
        sceneRef.current.selectBlockForPlacement(selectedBlockForPlacement)
      } else {
        sceneRef.current.cancelBlockPlacement()
      }
    }
  }, [isReady, selectedBlockForPlacement])

  // Expose scene methods
  useEffect(() => {
    if (isReady && sceneRef.current) {
      // Make scene methods available to parent components via ref
      ;(containerRef.current as any).__phaserScene = sceneRef.current
    }
  }, [isReady])

  return (
    <div
      ref={containerRef}
      id="phaser-container"
      className="w-full h-full"
      style={{ overflow: 'hidden' }}
    />
  )
}
