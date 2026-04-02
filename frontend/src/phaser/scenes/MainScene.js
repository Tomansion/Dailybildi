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
    this.universeConfig = {
      backgroundColor: '#000000',
      worldImageScale: 1,
      blockSize: 64,
      worldImages: []
    }
    this.parallaxLayers = []
    this.worldBounds = { width: 0, height: 0 }

    // Callbacks to communicate with Vue
    this.onBlockPlacedCallback = null
    this.onBlockSelectedCallback = null
    this.onBlockUpdatedCallback = null
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
      img.setScrollFactor(0.5 + (1 - 0.5) * (imgConfig.distance / 1000))
      img.setDepth(-1000 + imgConfig.distance)

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
    // Handle block drag
    this.input.on('drag', (pointer, gameObject) => {
      if (gameObject instanceof Block) {
        this.cameraManager.setBlockDragInProgress(true)
        const gridPos = GridManager.pixelsToGrid(pointer.x, pointer.y)
        gameObject.updatePosition(gridPos.gridX, gridPos.gridY)
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

    // Handle block click
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject instanceof Block) {
        this.selectBlock(gameObject)
      }
    })

    // Handle left click on empty space - place new block if one is selected
    this.input.on('pointerdown', (pointer) => {
      if (pointer.button === 2) {
        // Right click
        return
      }

      // Only place block if user has selected one from inventory
      if (this.selectedBlockData) {
        this.placeBlockAtPointer(pointer)
      }
    })

    // Update phantom block position on mouse move
    this.input.on('pointermove', (pointer) => {
      if (this.phantomBlock) {
        const gridPos = GridManager.pixelsToGrid(pointer.x, pointer.y)
        const pixelPos = GridManager.gridToPixels(gridPos.gridX, gridPos.gridY)
        this.phantomBlock.setPosition(pixelPos.x, pixelPos.y)
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

    for (const layer of this.parallaxLayers) {
      // This is already handled by scrollFactor
      // Just update position based on camera
      layer.image.setPosition(
        camera.centerX,
        camera.centerY
      )
    }
  }

  // Public methods called from Vue
  loadBlocks(placedBlocks) {
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
  }

  cancelBlockPlacement() {
    this.selectedBlockData = null
    if (this.phantomBlock) {
      this.phantomBlock.destroy()
      this.phantomBlock = null
    }
  }

  placeBlockAtPointer(pointer) {
    if (!this.selectedBlockData) return

    const gridPos = GridManager.pixelsToGrid(pointer.x, pointer.y)

    if (!GridManager.isWithinBounds(gridPos.gridX, gridPos.gridY)) {
      return
    }

    if (this.onBlockPlacedCallback) {
      this.onBlockPlacedCallback(
        this.selectedBlockData.blockCatalogKey,
        gridPos.gridX,
        gridPos.gridY
      )
    }
  }

  placeBlockAtDropPosition(blockData, pointer) {
    const gridPos = GridManager.pixelsToGrid(pointer.x, pointer.y)

    if (!GridManager.isWithinBounds(gridPos.gridX, gridPos.gridY)) {
      return
    }

    if (this.onBlockPlacedCallback) {
      this.onBlockPlacedCallback(
        blockData.blockCatalogKey,
        gridPos.gridX,
        gridPos.gridY
      )
    }
  }

  selectBlock(block) {
    if (this.selectedBlock) {
      this.selectedBlock.clearTint()
    }

    this.selectedBlock = block
    this.selectedBlock.setTint(0x888888)

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

  goHome() {
    if (this.cameraManager) {
      this.cameraManager.goHome()
    }
  }

  // Set callbacks
  setOnBlockPlaced(callback) {
    this.onBlockPlacedCallback = callback
  }

  setOnBlockSelected(callback) {
    this.onBlockSelectedCallback = callback
  }

  setOnBlockUpdated(callback) {
    this.onBlockUpdatedCallback = callback
  }
}
