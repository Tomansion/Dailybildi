import Phaser from 'phaser'
import { CameraManager } from '../managers/CameraManager'
import { GridManager } from '../managers/GridManager'
import { Block } from '../entities/Block'
import { UNIVERSE_ID, getUniverseConfigPath, getBackendUrl } from '@/lib/constants'

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' })
    this.cameraManager = null
    this.blocks = new Map()
    this.selectedBlock = null
    this.phantomBlock = null
    this.selectedBlockData = null
    this.readOnly = false
    this.universeConfig = {
      backgroundColor: '#000000',
      worldImageScale: 1,
      blockSize: 64,
      worldImages: []
    }
    this.parallaxLayers = []
    this.worldBounds = { width: 0, height: 0 }

    // Phantom block transformation state
    this.phantomBlockRotation = 0
    this.phantomBlockFlipX = false
    this.phantomBlockFlipY = false

    // Callbacks to communicate with Vue
    this.onBlockPlacedCallback = null
    this.onBlockSelectedCallback = null
    this.onBlockDeselectedCallback = null
    this.onBlockUpdatedCallback = null
    this.onBlockPlacementCancelledCallback = null
  }

  preload() {
    // Universe config will be loaded in create() using fetch
  }

  create() {
    // Load universe config using fetch and set up scene
    this.loadConfigAndSetup()
  }

  async loadConfigAndSetup() {
    // Load universe config using fetch
    try {
      const response = await fetch(getUniverseConfigPath())
      if (!response.ok) {
        throw new Error(`Failed to load universe config: ${response.statusText}`)
      }
      this.universeConfig = await response.json()
    } catch (error) {
      console.error('Error loading universe config:', error)
      this.universeConfig = {
        backgroundColor: '#000000',
        worldImageScale: 1,
        blockSize: 64,
        worldImages: []
      }
    }

    // Configure grid manager with block size from config
    GridManager.configure(this.universeConfig.blockSize)

    // Set background color
    this.cameras.main.setBackgroundColor(this.universeConfig.backgroundColor)

    // Load world images
    const basePath = `${getBackendUrl()}/univers/${UNIVERSE_ID}/`
    for (let i = 0; i < this.universeConfig.worldImages.length; i++) {
      const imgConfig = this.universeConfig.worldImages[i]
      this.load.image(
        `world_${i}`,
        basePath + imgConfig.path
      )
    }

    this.load.once('complete', () => {
      this.createWorldLayers()
      this.setupScene()
    })

    this.load.start()
  }

  createWorldLayers() {
    const scale = this.universeConfig.worldImageScale

    // Sort by distance descending (furthest first, so they render behind)
    const sortedImages = [...this.universeConfig.worldImages]
      .map((config, index) => ({ ...config, index }))
      .sort((a, b) => b.distance - a.distance)

    for (const imgConfig of sortedImages) {
      const img = this.add.image(0, 0, `world_${imgConfig.index}`)
      img.setOrigin(0.5, 0.5)
      img.setScale(scale)

      // Depth calculation:
      // Negative distance (foreground): above blocks (5000 + range)
      // Distance 0 to 1 (background): below blocks (-900 to -1000)
      let depth
      if (imgConfig.distance < 0) {
        // Negative distance = foreground, more negative = higher depth
        depth = 5000 - imgConfig.distance * 1000
      } else {
        // Positive distance = background
        depth = -900 - imgConfig.distance * 100
      }
      img.setDepth(depth)

      this.parallaxLayers.push({
        image: img,
        distance: imgConfig.distance
      })

      // Calculate world bounds from image
      const w = img.displayWidth
      const h = img.displayHeight
      this.worldBounds.width = Math.max(this.worldBounds.width, w)
      this.worldBounds.height = Math.max(this.worldBounds.height, h)
    }
  }

  setupScene() {
    this.cameraManager = new CameraManager(
      this,
      this.worldBounds.width,
      this.worldBounds.height
    )

    // Center camera on world origin (0, 0) at startup
    this.cameraManager.centerOn(0, 0)

    this.setupInputHandlers()
    this.cameraManager.setupInput()
  }

  shutdown() {
    this.blocks.clear()
    this.selectedBlock = null
    this.phantomBlock = null
    this.selectedBlockData = null
  }

  setupInputHandlers() {
    // In read-only mode, only setup camera controls (via CameraManager)
    if (this.readOnly) {
      return
    }

    // Handle Escape key - deselect block and cancel placement
    this.input.keyboard.on('keydown-ESC', () => {
      this.deselectBlock()
      this.cancelBlockPlacement()
    })

    // Handle F key - rotate selected block
    this.input.keyboard.on('keydown-R', () => {
      if (this.selectedBlockData) {
        this.rotatePhantomBlock()
      } else {
        this.rotateSelectedBlock()
      }
    })

    // Handle H key - flip horizontal
    this.input.keyboard.on('keydown-H', () => {
      if (this.selectedBlockData) {
        this.flipPhantomBlockHorizontal()
      } else {
        this.flipSelectedBlockHorizontal()
      }
    })

    // Handle V key - flip vertical
    this.input.keyboard.on('keydown-V', () => {
      if (this.selectedBlockData) {
        this.flipPhantomBlockVertical()
      } else {
        this.flipSelectedBlockVertical()
      }
    })

    // Handle block drag
    this.input.on('drag', (pointer, gameObject) => {
      if (gameObject instanceof Block) {
        this.cameraManager.setBlockDragInProgress(true)
        // Convert pointer to world coordinates for 1:1 dragging
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const snapped = GridManager.snapToGrid(worldPoint.x, worldPoint.y)
        gameObject.setPosition(snapped.x, snapped.y)
      }
    })

    // Handle drag end
    this.input.on('dragend', (pointer, gameObject) => {
      if (gameObject instanceof Block) {
        this.cameraManager.setBlockDragInProgress(false)
        const gridPos = GridManager.pixelsToGrid(gameObject.x, gameObject.y)

        // Snap to grid
        gameObject.updatePosition(gridPos.gridX, gridPos.gridY)

        // Trigger update callback
        if (this.onBlockUpdatedCallback) {
          this.onBlockUpdatedCallback(gameObject.blockKey, {
            gridX: gridPos.gridX,
            gridY: gridPos.gridY,
            rotation: gameObject.blockRotation,
            flipX: gameObject.flipX,
            flipY: gameObject.flipY
          })
        }
      }
    })

    // Handle left click on empty space - place new block if one is selected, or deselect current block
    // This is checked BEFORE gameobjectdown to prioritize block placement over block selection
    this.input.on('pointerdown', (pointer) => {
      if (pointer.button === 2) {
        // Right click
        return
      }

      // If we're in placement mode, try to place the block
      if (this.selectedBlockData) {
        this.placeBlockAtPointer(pointer)
        return
      }

      // Check if we clicked on a game object
      const hitArea = this.input.hitTestPointer(pointer)
      const clickedOnBlock = hitArea.some(obj => obj instanceof Block)
      
      if (clickedOnBlock) {
        // Block click will be handled by gameobjectdown
        return
      }

      // Click on empty space with no block selected - deselect the currently selected block
      this.deselectBlock()
    })

    // Handle block click - only if not in placement mode
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject instanceof Block && !this.selectedBlockData) {
        this.selectBlock(gameObject)
      }
    })

    // Update phantom block position on mouse move and handle block hover effects
    this.input.on('pointermove', (pointer) => {
      if (this.phantomBlock) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const snapped = GridManager.snapToGrid(worldPoint.x, worldPoint.y)
        this.phantomBlock.setPosition(snapped.x, snapped.y)
      }

      // Update hover state for blocks
      const hitArea = this.input.hitTestPointer(pointer)
      const hoveredBlock = hitArea.find(obj => obj instanceof Block)

      for (const block of this.blocks.values()) {
        if (block === this.selectedBlock) {
          // Don't change selected block's opacity on hover
          continue
        }

        if (block === hoveredBlock) {
          block.setAlpha(0.7)
        } else {
          block.setAlpha(1)
        }
      }
    })
  }

  update() {
    if (this.cameraManager) {
      this.cameraManager.update()
    }
    this.updateParallax()
  }

  updateParallax() {
    if (!this.parallaxLayers) return

    const camera = this.cameras.main
    const scale = this.universeConfig.worldImageScale

    // Use camera world view center for proper parallax alignment
    const cameraCenterX = camera.worldView.centerX
    const cameraCenterY = camera.worldView.centerY

    for (const layer of this.parallaxLayers) {
      // distance 0 = stays fixed in world coords (no offset)
      // distance < 0 = foreground (moves opposite - parallax effect)
      // distance > 0 = background (moves with camera)
      layer.image.setPosition(
        Math.floor(cameraCenterX * layer.distance),
        Math.floor(cameraCenterY * layer.distance)
      )
      
      // Scale based on distance and camera zoom
      // distance 0 = fixed scale (no zoom effect)
      // As camera zooms in, layers should shrink to maintain constant apparent size
      // Far layers shrink less, near layers shrink more (for depth perception)
      let finalScale
      if (layer.distance === 0) {
        // Distance 0 layers stay at fixed scale
        finalScale = scale
      } else {
        // Counterbalance camera zoom: scale = 1 / zoom^exponent
        // where exponent is based on distance
        // distance ±1: exponent = 0.5 (shrink by 1/sqrt(zoom))
        // distance 0: exponent = 1 (shrink by 1/zoom)
        const zoomExponent = -(Math.abs(layer.distance) * 1.1)
        finalScale = scale * Math.pow(camera.zoom, zoomExponent)
      }
      layer.image.setScale(finalScale)
    }
  }

  // Public methods called from Vue
  loadBlocks(placedBlocks) {
    // Destroy old blocks before clearing the map
    for (const block of this.blocks.values()) {
      block.destroy()
    }
    this.blocks.clear()

    for (const blockData of placedBlocks) {
      const block = new Block(this, blockData)
      this.blocks.set(blockData._key, block)
    }
  }

  loadBlockImages(blockImages, onComplete) {
    const toLoad = blockImages.filter(
      (img) => !this.textures.exists(`block_${img.id}_${img.layer}_${img.rarity}`)
    )

    if (toLoad.length === 0) {
      if (onComplete) onComplete()
      return
    }

    toLoad.forEach((img) => {
      this.load.image(
        `block_${img.id}_${img.layer}_${img.rarity}`,
        img.imagePath
      )
    })

    this.load.once('complete', () => {
      if (onComplete) onComplete()
    })

    this.load.start()
  }

  selectBlockForPlacement(blockData) {
    this.selectedBlockData = blockData
    this.createPhantomBlock(`block_${blockData.id}_${blockData.layer}_${blockData.rarity}`)
  }

  createPhantomBlock(key) {
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
    }

    this.phantomBlock = this.add.sprite(0, 0, key)
    this.phantomBlock.setOrigin(0.5, 0.5)
    this.phantomBlock.setAlpha(0.5)
    this.phantomBlock.setDepth(1000000)
    
    // Apply stored transformation state
    this.phantomBlock.setAngle(this.phantomBlockRotation)
    this.phantomBlock.setFlipX(this.phantomBlockFlipX)
    this.phantomBlock.setFlipY(this.phantomBlockFlipY)
  }

  cancelBlockPlacement() {
    this.selectedBlockData = null
    this.phantomBlockRotation = 0
    this.phantomBlockFlipX = false
    this.phantomBlockFlipY = false
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
      this.phantomBlock = null
    }
    if (this.onBlockPlacementCancelledCallback) {
      this.onBlockPlacementCancelledCallback()
    }
  }

  placeBlockAtPointer(pointer) {
    if (!this.selectedBlockData) return

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const grid = GridManager.pixelsToGrid(worldPoint.x, worldPoint.y)

    if (!GridManager.isWithinBounds(grid.gridX, grid.gridY)) {
      return
    }

    if (this.onBlockPlacedCallback) {
      this.onBlockPlacedCallback(
        this.selectedBlockData.blockCatalogKey,
        grid.gridX,
        grid.gridY,
        {
          rotation: this.phantomBlockRotation,
          flipX: this.phantomBlockFlipX,
          flipY: this.phantomBlockFlipY
        }
      )
    }
  }

  placeBlockAtDropPosition(blockData, pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const grid = GridManager.pixelsToGrid(worldPoint.x, worldPoint.y)

    if (!GridManager.isWithinBounds(grid.gridX, grid.gridY)) {
      return
    }

    if (this.onBlockPlacedCallback) {
      this.onBlockPlacedCallback(
        blockData.blockCatalogKey,
        grid.gridX,
        grid.gridY,
        {
          rotation: 0,
          flipX: false,
          flipY: false
        }
      )
    }
  }

  selectBlock(block) {
    if (this.selectedBlock) {
      this.selectedBlock.clearTint()
      this.selectedBlock.setAlpha(1)
      // Restore original depth
      if (this.selectedBlock._originalDepth !== undefined) {
        this.selectedBlock.setDepth(this.selectedBlock._originalDepth)
      }
    }

    this.selectedBlock = block
    // Store original depth and set to high depth
    this.selectedBlock._originalDepth = block.depth
    this.selectedBlock.setDepth(10000)
    this.selectedBlock.setAlpha(0.8)
    this.selectedBlock.setTintFill(0x999933)

    if (this.onBlockSelectedCallback) {
      this.onBlockSelectedCallback(block.blockKey)
    }
  }

  selectBlockByKey(blockKey) {
    const block = this.blocks.get(blockKey)
    if (block) {
      this.selectBlock(block)
    }
  }

  deselectBlock() {
    if (this.selectedBlock) {
      this.selectedBlock.setAlpha(1)
      this.selectedBlock.clearTint()
      // Restore original depth
      if (this.selectedBlock._originalDepth !== undefined) {
        this.selectedBlock.setDepth(this.selectedBlock._originalDepth)
      }
      this.selectedBlock = null
      
      if (this.onBlockDeselectedCallback) {
        this.onBlockDeselectedCallback()
      }
    }
  }

  removeSelectedBlock() {
    if (!this.selectedBlock) return

    const blockKey = this.selectedBlock.blockKey

    this.selectedBlock.destroy()
    this.blocks.delete(blockKey)
    this.selectedBlock = null

    if (this.onBlockUpdatedCallback) {
      this.onBlockUpdatedCallback(blockKey, { removed: true })
    }
  }

  rotateSelectedBlock() {
    if (!this.selectedBlock) return

    const newRotation = (this.selectedBlock.blockRotation + 90) % 360
    this.selectedBlock.updateRotation(newRotation)

    if (this.onBlockUpdatedCallback) {
      this.onBlockUpdatedCallback(this.selectedBlock.blockKey, {
        rotation: newRotation
      })
    }
  }

  rotatePhantomBlock() {
    if (!this.phantomBlock) return

    this.phantomBlockRotation = (this.phantomBlockRotation + 90) % 360
    this.phantomBlock.setAngle(this.phantomBlockRotation)
  }

  flipSelectedBlockHorizontal() {
    if (!this.selectedBlock) return

    const flipX = !this.selectedBlock.flipX
    this.selectedBlock.updateFlip(flipX, this.selectedBlock.flipY)

    if (this.onBlockUpdatedCallback) {
      this.onBlockUpdatedCallback(this.selectedBlock.blockKey, {
        flipX: flipX
      })
    }
  }

  flipPhantomBlockHorizontal() {
    if (!this.phantomBlock) return

    this.phantomBlockFlipX = !this.phantomBlockFlipX
    this.phantomBlock.setFlipX(this.phantomBlockFlipX)
  }

  flipSelectedBlockVertical() {
    if (!this.selectedBlock) return

    const flipY = !this.selectedBlock.flipY
    this.selectedBlock.updateFlip(this.selectedBlock.flipX, flipY)

    if (this.onBlockUpdatedCallback) {
      this.onBlockUpdatedCallback(this.selectedBlock.blockKey, {
        flipY: flipY
      })
    }
  }

  flipPhantomBlockVertical() {
    if (!this.phantomBlock) return

    this.phantomBlockFlipY = !this.phantomBlockFlipY
    this.phantomBlock.setFlipY(this.phantomBlockFlipY)
  }

  goHome() {
    if (this.cameraManager) {
      this.cameraManager.goHome()
    }
  }

  zoomIn() {
    if (this.cameraManager) {
      this.cameraManager.zoomIn()
    }
  }

  zoomOut() {
    if (this.cameraManager) {
      this.cameraManager.zoomOut()
    }
  }

  setReadOnly(isReadOnly = true) {
    this.readOnly = isReadOnly
  }

  // Set callbacks
  setOnBlockPlaced(callback) {
    this.onBlockPlacedCallback = callback
  }

  setOnBlockSelected(callback) {
    this.onBlockSelectedCallback = callback
  }

  setOnBlockDeselected(callback) {
    this.onBlockDeselectedCallback = callback
  }

  setOnBlockUpdated(callback) {
    this.onBlockUpdatedCallback = callback
  }

  setOnBlockPlacementCancelled(callback) {
    this.onBlockPlacementCancelledCallback = callback
  }
}
