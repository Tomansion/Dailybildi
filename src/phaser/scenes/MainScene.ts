import * as Phaser from 'phaser'
import { CameraManager } from '../managers/CameraManager'
import { GridManager } from '../managers/GridManager'
import { Block } from '../entities/Block'
import { PlacedBlockWithData } from '@/types/world'
import { UNIVERSE_CONFIG_PATH, UNIVERSE_ID } from '@/lib/constants'

interface WorldImageConfig {
  path: string
  distance: number
}

interface UniverseConfig {
  backgroundColor: string
  worldImageScale: number
  worldImages: WorldImageConfig[]
}

interface ParallaxLayer {
  image: Phaser.GameObjects.Image
  distance: number
}

export class MainScene extends Phaser.Scene {
  private cameraManager!: CameraManager
  private blocks: Map<string, Block> = new Map()
  private selectedBlock: Block | null = null
  private phantomBlock: Phaser.GameObjects.Sprite | null = null
  private selectedBlockData: { imagePath: string; blockCatalogKey: string } | null = null
  private universeConfig: UniverseConfig = { backgroundColor: '#000000', worldImageScale: 1, worldImages: [] }
  private parallaxLayers: ParallaxLayer[] = []
  private worldBounds = { width: 0, height: 0 }
  
  // Callbacks to communicate with React
  private onBlockPlacedCallback?: (blockKey: string, gridX: number, gridY: number) => void
  private onBlockSelectedCallback?: (blockKey: string) => void
  private onBlockUpdatedCallback?: (blockKey: string, updates: any) => void

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // Load universe config first
    this.load.json('universe_config', UNIVERSE_CONFIG_PATH)
  }

  create() {
    // Get universe config
    this.universeConfig = this.cache.json.get('universe_config') || this.universeConfig
    
    // Set background color
    this.cameras.main.setBackgroundColor(this.universeConfig.backgroundColor)
    
    // Load world images
    const basePath = `/univers/${UNIVERSE_ID}/`
    for (let i = 0; i < this.universeConfig.worldImages.length; i++) {
      const imgConfig = this.universeConfig.worldImages[i]
      this.load.image(`world_bg_${i}`, basePath + imgConfig.path)
    }
    
    this.load.once('complete', () => {
      this.createWorldLayers()
      this.setupScene()
    })
    this.load.start()
  }

  private createWorldLayers() {
    const scale = this.universeConfig.worldImageScale
    
    // Sort by distance descending (furthest first, so they render behind)
    const sortedImages = [...this.universeConfig.worldImages]
      .map((config, index) => ({ ...config, index }))
      .sort((a, b) => b.distance - a.distance)
    
    for (const imgConfig of sortedImages) {
      const image = this.add.image(0, 0, `world_bg_${imgConfig.index}`)
        .setOrigin(0.5, 0.5)
        .setScale(scale)
      
      // Depth calculation:
      // Negative distance (foreground): above blocks (5000 + range)
      // Distance 0 to 1 (background): below blocks (-900 to -1000)
      let depth: number
      if (imgConfig.distance < 0) {
        // Negative distance = foreground, more negative = higher depth
        depth = 5000 - imgConfig.distance * 1000
      } else {
        // Positive distance = background
        depth = -900 - imgConfig.distance * 100
      }
      image.setDepth(depth)
      
      this.parallaxLayers.push({
        image,
        distance: imgConfig.distance
      })
      
      // Use the closest layer (distance 0) for bounds calculation
      if (imgConfig.distance === 0) {
        this.worldBounds.width = image.displayWidth
        this.worldBounds.height = image.displayHeight
      }
    }
  }

  private setupScene() {
    // Setup camera with bounds based on world image (2x the image size)
    this.cameraManager = new CameraManager(this, this.worldBounds.width, this.worldBounds.height)

    // Setup input handlers
    this.setupInputHandlers()

    // Setup camera input (after MainScene input handlers to avoid removal)
    this.cameraManager.setupInput()

    // Center camera on world
    this.cameraManager.goHome()
  }

  shutdown() {
    // Remove all event listeners
    this.input.removeAllListeners()
    
    // Destroy phantom block
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
      this.phantomBlock = null
    }
    
    // Clear selected block
    this.selectedBlock = null
    this.selectedBlockData = null
    
    // Destroy all blocks
    this.blocks.forEach(block => block.destroy())
    this.blocks.clear()
    
    // Clear parallax layers
    this.parallaxLayers.forEach(layer => layer.image.destroy())
    this.parallaxLayers = []
  }

  private setupInputHandlers() {
    // Remove any existing listeners first to prevent duplicates
    this.input.removeAllListeners('pointerdown')
    this.input.removeAllListeners('dragstart')
    this.input.removeAllListeners('drag')
    this.input.removeAllListeners('dragend')
    
    // Handle canvas click for block placement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !pointer.middleButtonDown()) {
        // Check if clicking on a block
        const clickedObjects = this.input.hitTestPointer(pointer)
        
        if (clickedObjects.length > 0) {
          const clicked = clickedObjects[0]
          if (clicked instanceof Block) {
            this.selectBlock(clicked)
            return
          }
        }

        // Place new block if one is selected for placement
        if (this.selectedBlockData && this.phantomBlock) {
          this.placeBlockAtPointer(pointer)
        }
      }
    })

    // Setup drag handlers for placed blocks
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof Block) 
        this.cameraManager.setBlockDragInProgress(true)
      
    })

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (gameObject instanceof Block) {
        const snapped = GridManager.snapToGrid(dragX, dragY)
        gameObject.setPosition(snapped.x, snapped.y)
        
        // Update phantom to show where it will snap
        if (this.phantomBlock) {
          this.phantomBlock.setPosition(snapped.x, snapped.y)
        }
      }
    })

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof Block) {
        this.cameraManager.setBlockDragInProgress(false)
        
        const grid = GridManager.pixelsToGrid(gameObject.x, gameObject.y)
        gameObject.updatePosition(grid.gridX, grid.gridY)
        
        // Notify React
        if (this.onBlockUpdatedCallback) {
          this.onBlockUpdatedCallback(gameObject.blockKey, {
            gridX: grid.gridX,
            gridY: grid.gridY,
          })
        }
      }
    })
  }

  update() {
    // Don't run until scene is fully initialized
    if (!this.cameraManager) return
    
    // Update camera controls
    this.cameraManager.update()

    // Update parallax layers
    this.updateParallax()

    // Update phantom block position
    if (this.phantomBlock && this.selectedBlockData) {
      const pointer = this.input.activePointer
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const snapped = GridManager.snapToGrid(worldPoint.x, worldPoint.y)
      this.phantomBlock.setPosition(snapped.x, snapped.y)
    }
  }

  private updateParallax() {
    const camera = this.cameras.main
    
    for (const layer of this.parallaxLayers) {
      // distance 0 = moves with camera (stays in place in world coords)
      // distance 1 = doesn't move (stays fixed relative to camera center)
      // Parallax factor: how much the layer moves relative to camera
      const parallaxFactor = 1 - layer.distance
      
      // Position the layer based on camera scroll and parallax factor
      layer.image.setPosition(
        camera.scrollX * (1 - parallaxFactor),
        camera.scrollY * (1 - parallaxFactor)
      )
    }
  }

  // Public methods called from React
  loadBlocks(placedBlocks: PlacedBlockWithData[]) {
    // Clear existing blocks
    this.blocks.forEach(block => block.destroy())
    this.blocks.clear()

    // Load all blocks
    for (const blockData of placedBlocks) {
      const block = new Block(this, blockData)
      this.blocks.set(block.blockKey, block)
    }
  }

  loadBlockImages(blockImages: Array<{ id: string; layer: number; rarity: number; imagePath: string }>, onComplete?: () => void) {
    let needsLoad = false
    
    for (const block of blockImages) {
      const key = `block_${block.id}_${block.layer}_${block.rarity}`
      
      if (!this.textures.exists(key)) {
        this.load.image(key, block.imagePath)
        needsLoad = true
      }
    }
    
    if (needsLoad) {
      this.load.once('complete', () => {
        if (onComplete) onComplete()
      })
      this.load.start()
    } else {
      // All images already loaded
      if (onComplete) onComplete()
    }
  }

  selectBlockForPlacement(blockData: { imagePath: string; blockCatalogKey: string; id: string; layer: number; rarity: number }) {
    this.selectedBlockData = blockData
    
    // Create phantom block
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
    }

    const key = `block_${blockData.id}_${blockData.layer}_${blockData.rarity}`
    
    // Check if texture exists, if not load it first
    if (!this.textures.exists(key)) {
      this.load.image(key, blockData.imagePath)
      this.load.once('complete', () => {
        this.createPhantomBlock(key)
      })
      this.load.start()
    } else {
      this.createPhantomBlock(key)
    }
  }

  private createPhantomBlock(key: string) {
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
    }
    
    this.phantomBlock = this.add.sprite(0, 0, key)
    this.phantomBlock.setAlpha(0.5)
    this.phantomBlock.setDepth(10000)
  }

  cancelBlockPlacement() {
    this.selectedBlockData = null
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
      this.phantomBlock = null
    }
  }

  private placeBlockAtPointer(pointer: Phaser.Input.Pointer) {
    if (!this.selectedBlockData) return

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const grid = GridManager.pixelsToGrid(worldPoint.x, worldPoint.y)

    if (!GridManager.isWithinBounds(grid.gridX, grid.gridY)) {
      console.warn('Cannot place block outside bounds')
      return
    }

    // Notify React to handle API call
    if (this.onBlockPlacedCallback) {
      this.onBlockPlacedCallback(this.selectedBlockData.blockCatalogKey, grid.gridX, grid.gridY)
    }

    this.cancelBlockPlacement()
  }

  private selectBlock(block: Block) {
    // Deselect previous
    if (this.selectedBlock) {
      this.selectedBlock.clearTint()
    }

    // Select new
    this.selectedBlock = block
    this.selectedBlock.setTint(0xffff00)

    // Notify React
    if (this.onBlockSelectedCallback) {
      this.onBlockSelectedCallback(block.blockKey)
    }
  }

  deselectBlock() {
    if (this.selectedBlock) {
      this.selectedBlock.clearTint()
      this.selectedBlock = null
    }
  }

  removeSelectedBlock() {
    if (this.selectedBlock) {
      const key = this.selectedBlock.blockKey
      this.selectedBlock.destroy()
      this.blocks.delete(key)
      this.selectedBlock = null
      return key
    }
    return null
  }

  rotateSelectedBlock() {
    if (this.selectedBlock) {
      const newRotation = (this.selectedBlock.blockRotation + 90) % 360
      this.selectedBlock.updateRotation(newRotation)
      
      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(this.selectedBlock.blockKey, {
          rotation: newRotation,
        })
      }
    }
  }

  flipSelectedBlockHorizontal() {
    if (this.selectedBlock) {
      const newFlipX = !this.selectedBlock.flipX
      this.selectedBlock.updateFlip(newFlipX, this.selectedBlock.flipY)
      
      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(this.selectedBlock.blockKey, {
          flipX: newFlipX,
        })
      }
    }
  }

  flipSelectedBlockVertical() {
    if (this.selectedBlock) {
      const newFlipY = !this.selectedBlock.flipY
      this.selectedBlock.updateFlip(this.selectedBlock.flipX, newFlipY)
      
      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(this.selectedBlock.blockKey, {
          flipY: newFlipY,
        })
      }
    }
  }

  goHome() {
    this.cameraManager.goHome()
  }

  // Set callbacks
  setOnBlockPlaced(callback: (blockKey: string, gridX: number, gridY: number) => void) {
    this.onBlockPlacedCallback = callback
  }

  setOnBlockSelected(callback: (blockKey: string) => void) {
    this.onBlockSelectedCallback = callback
  }

  setOnBlockUpdated(callback: (blockKey: string, updates: any) => void) {
    this.onBlockUpdatedCallback = callback
  }
}
