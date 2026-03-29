"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

export interface PhaserSceneHandle {
  rotateSelectedBlock: () => void;
  flipSelectedBlockHorizontal: () => void;
  flipSelectedBlockVertical: () => void;
  removeSelectedBlock: () => void;
  goHome: () => void;
}

interface PhaserCanvasProps {
  placedBlocks: any[];
  blockImages: Array<{
    id: string;
    layer: number;
    rarity: number;
    imagePath: string;
  }>;
  onBlockPlaced: (
    blockCatalogKey: string,
    gridX: number,
    gridY: number,
  ) => Promise<void>;
  onBlockUpdated: (blockKey: string, updates: any) => Promise<void>;
  onBlockSelected: (blockKey: string) => void;
  selectedBlockForPlacement: {
    imagePath: string;
    blockCatalogKey: string;
    id: string;
    layer: number;
    rarity: number;
  } | null;
}

const PhaserCanvasComponent = forwardRef<PhaserSceneHandle, PhaserCanvasProps>(function PhaserCanvas(
  {
    placedBlocks,
    blockImages,
    onBlockPlaced,
    onBlockUpdated,
    onBlockSelected,
    selectedBlockForPlacement,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Phaser game
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) {
      return;
    }

    // Prevent multiple initializations
    if (gameRef.current) {
      return;
    }

    // Dynamic import Phaser only on client
    import("@/phaser/PhaserGame").then(({ PhaserGameWrapper }) => {
      // Double-check still needed after async import
      if (gameRef.current) {
        return;
      }

      const game = new PhaserGameWrapper();
      game.initialize("phaser-container");
      gameRef.current = game;

      // Wait for scene to be ready
      const checkScene = setInterval(() => {
        const scene = game.getMainScene();
        if (scene) {
          sceneRef.current = scene;
          clearInterval(checkScene);
          setIsReady(true);

          // Setup callbacks
          scene.setOnBlockPlaced(
            async (blockKey: string, gridX: number, gridY: number) => {
              await onBlockPlaced(blockKey, gridX, gridY);
            },
          );

          scene.setOnBlockUpdated(async (blockKey: string, updates: any) => {
            await onBlockUpdated(blockKey, updates);
          });

          scene.setOnBlockSelected((blockKey: string) => {
            onBlockSelected(blockKey);
          });
        }
      }, 100);

      return () => {
        clearInterval(checkScene);
      };
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
        sceneRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  // Load block images and then placed blocks when ready
  useEffect(() => {
    if (isReady && sceneRef.current && blockImages.length > 0) {
      sceneRef.current.loadBlockImages(blockImages, () => {
        // Load blocks only after images are loaded
        if (sceneRef.current) {
          sceneRef.current.loadBlocks(placedBlocks);
        }
      });
    } else if (isReady && sceneRef.current && blockImages.length === 0) {
      // No images to load, load blocks directly
      sceneRef.current.loadBlocks(placedBlocks);
    }
  }, [isReady, blockImages, placedBlocks]);

  // Handle block selection for placement
  useEffect(() => {
    if (isReady && sceneRef.current) {
      if (selectedBlockForPlacement) {
        sceneRef.current.selectBlockForPlacement(selectedBlockForPlacement);
      } else {
        sceneRef.current.cancelBlockPlacement();
      }
    }
  }, [isReady, selectedBlockForPlacement]);

  // Expose scene methods via forwardRef
  useImperativeHandle(
    ref,
    () => ({
      rotateSelectedBlock: () =>{
        console.log("rotateSelectedBlock called from parent");
        sceneRef.current?.rotateSelectedBlock()},
      flipSelectedBlockHorizontal: () =>
        sceneRef.current?.flipSelectedBlockHorizontal(),
      flipSelectedBlockVertical: () =>
        sceneRef.current?.flipSelectedBlockVertical(),
      removeSelectedBlock: () => sceneRef.current?.removeSelectedBlock(),
      goHome: () => sceneRef.current?.goHome(),
    }),
    [isReady]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    if (!isReady || !sceneRef.current) return
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'))
      
      // Get the canvas position relative to viewport
      const container = containerRef.current
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const offsetX = e.clientX - rect.left
      const offsetY = e.clientY - rect.top
      
      // Create a Phaser pointer object to pass to the scene
      const pointer = {
        x: offsetX,
        y: offsetY,
      }
      
      // Place block at the dropped position
      sceneRef.current.placeBlockAtDropPosition(dragData, pointer)
    } catch (error) {
      console.error('Failed to process drop:', error)
    }
  }

  return (
    <div
      ref={containerRef}
      id="phaser-container"
      className="w-full h-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        overflow: "hidden",
      }}
    />
  );
});

PhaserCanvasComponent.displayName = "PhaserCanvas";

export const PhaserCanvas = PhaserCanvasComponent;
export default PhaserCanvasComponent;
