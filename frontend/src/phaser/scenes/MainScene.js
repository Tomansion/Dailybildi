import Phaser from 'phaser'
import { CameraManager } from '../managers/CameraManager'
import { GridManager } from '../managers/GridManager'
import { Block } from '../entities/Block'
import { UNIVERSE_ID, getUniverseConfigPath, getBackendUrl } from '@/lib/constants'
import pinchPluginUrl from '@/utils/rexpinchplugin.min.js?url'

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' })
    this.cameraManager = null
    this.blocks = new Map()
    this.selectedBlock = null
    this.selectedBlocks = new Set()
    this.phantomBlock = null
    this.selectedBlockData = null
    this.readOnly = false
    this.selectionMode = false
    this.selectionGraphics = null
    this.selectionStartWorldPoint = null
    this.selectionCurrentWorldPoint = null
    this.isSelectionDragging = false
    this.shouldAppendSelection = false
    this.pointerMultiSelectActive = false
    this.skipModifierDragBlockKey = null
    this.blockDragSnapshot = null
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
    this.onBlocksUpdatedCallback = null
    this.onBlockPlacementCancelledCallback = null
  }

  preload() {
    this.load.plugin('rexpinchplugin', pinchPluginUrl, true)
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
    this.input.dragDistanceThreshold = this.getBlockDragThreshold()

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
    this.selectedBlocks.clear()
    this.phantomBlock = null
    this.selectedBlockData = null
    this.selectionGraphics = null
    this.selectionStartWorldPoint = null
    this.selectionCurrentWorldPoint = null
    this.isSelectionDragging = false
    this.shouldAppendSelection = false
    this.pointerMultiSelectActive = false
    this.skipModifierDragBlockKey = null
    this.blockDragSnapshot = null
  }

  getBlockDragThreshold() {
    return GridManager.BLOCK_SIZE / 4
  }

  isMultiSelectModifierActive(pointer) {
    return Boolean(pointer?.event?.shiftKey || pointer?.event?.ctrlKey || pointer?.event?.metaKey)
  }

  canStartCameraDrag(pointer) {
    if (pointer.button !== 0) {
      return true
    }

    if (this.selectionMode || this.selectedBlockData) {
      return false
    }

    if (this.getBlockAtPointer(pointer)) {
      return false
    }

    return true
  }

  getBlockAtPointer(pointer) {
    const hitArea = this.input.hitTestPointer(pointer)
    return hitArea.find((obj) => obj instanceof Block) || null
  }

  setupInputHandlers() {
    // In read-only mode, only setup camera controls (via CameraManager)
    if (this.readOnly) {
      return
    }

    this.selectionGraphics = this.add.graphics()
    this.selectionGraphics.setDepth(1000001)

    // Handle Escape key - deselect block and cancel placement
    this.input.keyboard.on('keydown-ESC', () => {
      this.clearSelection()
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

    this.input.on('dragstart', (pointer, gameObject) => {
      if (!(gameObject instanceof Block) || this.selectedBlockData) {
        return
      }

      if (this.pointerMultiSelectActive && this.skipModifierDragBlockKey === gameObject.blockKey) {
        return
      }

      if (!this.selectedBlocks.has(gameObject)) {
        if (this.pointerMultiSelectActive || this.isMultiSelectModifierActive(pointer)) {
          this.addBlockToSelection(gameObject)
        } else {
          this.selectBlock(gameObject)
        }
      }

      this.cameraManager.setBlockDragInProgress(true)
      this.blockDragSnapshot = {
        draggedBlockKey: gameObject.blockKey,
        originGridX: gameObject.gridX,
        originGridY: gameObject.gridY,
        positions: new Map(
          Array.from(this.selectedBlocks).map((block) => [
            block.blockKey,
            {
              gridX: block.gridX,
              gridY: block.gridY
            }
          ])
        )
      }
    })

    // Handle block drag
    this.input.on('drag', (pointer, gameObject) => {
      if (gameObject instanceof Block) {
        this.cameraManager.setBlockDragInProgress(true)
        // Convert pointer to world coordinates for 1:1 dragging
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const snapped = GridManager.snapToGrid(worldPoint.x, worldPoint.y)

        if (this.blockDragSnapshot && this.selectedBlocks.has(gameObject)) {
          const draggedGrid = GridManager.pixelsToGrid(snapped.x, snapped.y)
          const deltaGridX = draggedGrid.gridX - this.blockDragSnapshot.originGridX
          const deltaGridY = draggedGrid.gridY - this.blockDragSnapshot.originGridY

          for (const block of this.selectedBlocks) {
            const startPosition = this.blockDragSnapshot.positions.get(block.blockKey)
            if (!startPosition) continue

            const nextGridX = startPosition.gridX + deltaGridX
            const nextGridY = startPosition.gridY + deltaGridY
            const nextPosition = GridManager.gridToPixels(nextGridX, nextGridY)
            block.setPosition(nextPosition.x, nextPosition.y)
          }

          return
        }

        gameObject.setPosition(snapped.x, snapped.y)
      }
    })

    // Handle drag end
    this.input.on('dragend', (pointer, gameObject) => {
      if (gameObject instanceof Block) {
        this.cameraManager.setBlockDragInProgress(false)
        const draggedBlocks = this.blockDragSnapshot
          ? Array.from(this.selectedBlocks)
          : [gameObject]
        const movedBlocks = []

        for (const block of draggedBlocks) {
          const previousPosition = this.blockDragSnapshot?.positions.get(block.blockKey) ?? {
            gridX: block.gridX,
            gridY: block.gridY
          }
          const gridPos = GridManager.pixelsToGrid(block.x, block.y)

          // Snap to grid
          block.updatePosition(gridPos.gridX, gridPos.gridY)

          const hasMoved =
            previousPosition.gridX !== gridPos.gridX ||
            previousPosition.gridY !== gridPos.gridY

          if (!hasMoved) {
            continue
          }

          movedBlocks.push({
            blockKey: block.blockKey,
            gridX: gridPos.gridX,
            gridY: gridPos.gridY,
            rotation: block.blockRotation,
            flipX: block.flipX,
            flipY: block.flipY
          })
        }

        if (movedBlocks.length > 1 && this.onBlocksUpdatedCallback) {
          this.onBlocksUpdatedCallback(movedBlocks)
        } else if (movedBlocks.length === 1 && this.onBlockUpdatedCallback) {
          const movedBlock = movedBlocks[0]
          this.onBlockUpdatedCallback(movedBlock.blockKey, movedBlock)
        }

        this.blockDragSnapshot = null
      }
    })

    // Handle left click on empty space - place new block if one is selected, or deselect current block
    // This is checked BEFORE gameobjectdown to prioritize block placement over block selection
    this.input.on('pointerdown', (pointer) => {
      this.pointerMultiSelectActive = this.isMultiSelectModifierActive(pointer)

      if (this.cameraManager?.isTouchGestureActive()) {
        return
      }

      if (pointer.button === 2) {
        // Right click
        return
      }

      if (this.selectionMode && !this.selectedBlockData) {
        const hitArea = this.input.hitTestPointer(pointer)
        const clickedOnBlock = hitArea.some(obj => obj instanceof Block)

        if (!clickedOnBlock) {
          this.startSelectionMarquee(pointer)
        }

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

      if (this.isMultiSelectModifierActive(pointer)) {
        return
      }

      // Click on empty space with no block selected - deselect the currently selected block
      this.clearSelection()
    })

    // Handle block click - only if not in placement mode
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (this.cameraManager?.isTouchGestureActive()) {
        return
      }

      if (gameObject instanceof Block && !this.selectedBlockData) {
        if (this.isMultiSelectModifierActive(pointer)) {
          if (this.selectedBlocks.has(gameObject)) {
            this.skipModifierDragBlockKey = gameObject.blockKey
            this.toggleBlockSelection(gameObject)
          } else {
            this.addBlockToSelection(gameObject)
          }
          return
        }

        if (this.selectedBlocks.has(gameObject)) {
          return
        }

        this.selectBlock(gameObject)
      }
    })

    this.input.on('pointerup', () => {
      this.pointerMultiSelectActive = false
      this.skipModifierDragBlockKey = null

      if (this.isSelectionDragging) {
        this.finishSelectionMarquee()
      }
    })

    // Update phantom block position on mouse move and handle block hover effects
    this.input.on('pointermove', (pointer) => {
      if (this.cameraManager?.isTouchGestureActive()) {
        return
      }

      if (this.isSelectionDragging) {
        this.updateSelectionMarquee(pointer)
        return
      }

      if (this.phantomBlock) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const snapped = GridManager.snapToGrid(worldPoint.x, worldPoint.y)
        this.phantomBlock.setPosition(snapped.x, snapped.y)
      }

      // Update hover state for blocks
      const hitArea = this.input.hitTestPointer(pointer)
      const hoveredBlock = hitArea.find(obj => obj instanceof Block)

      for (const block of this.blocks.values()) {
        if (this.selectedBlocks.has(block)) {
          // Don't change selected blocks' opacity on hover
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
    this.clearSelection({ notify: false })

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
    this.setSelectedBlocks(block ? [block] : [])
  }

  selectBlockByKey(blockKey) {
    const block = this.blocks.get(blockKey)
    if (block) {
      this.selectBlock(block)
    }
  }

  deselectBlock() {
    this.clearSelection()
  }

  removeSelectedBlock() {
    if (this.selectedBlocks.size === 0) return

    const blocksToRemove = Array.from(this.selectedBlocks)

    this.clearSelection({ notify: false })

    for (const block of blocksToRemove) {
      const blockKey = block.blockKey
      block.destroy()
      this.blocks.delete(blockKey)

      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(blockKey, { removed: true })
      }
    }

    if (this.onBlockDeselectedCallback) {
      this.onBlockDeselectedCallback()
    }
  }

  rotateSelectedBlock() {
    if (this.selectedBlocks.size === 0) return

    const updates = []

    for (const block of this.selectedBlocks) {
      const newRotation = (block.blockRotation + 90) % 360
      block.updateRotation(newRotation)

      updates.push({
        blockKey: block.blockKey,
        rotation: newRotation,
        gridX: block.gridX,
        gridY: block.gridY,
        flipX: block.flipX,
        flipY: block.flipY,
        zOrder: block.zOrder
      })

      if (this.selectedBlocks.size > 1) {
        continue
      }

      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(block.blockKey, {
          rotation: newRotation
        })
      }
    }

    if (updates.length > 1 && this.onBlocksUpdatedCallback) {
      this.onBlocksUpdatedCallback(updates)
    }
  }

  rotatePhantomBlock() {
    if (!this.phantomBlock) return

    this.phantomBlockRotation = (this.phantomBlockRotation + 90) % 360
    this.phantomBlock.setAngle(this.phantomBlockRotation)
  }

  flipSelectedBlockHorizontal() {
    if (this.selectedBlocks.size === 0) return

    const updates = []

    for (const block of this.selectedBlocks) {
      const flipX = !block.flipX
      block.updateFlip(flipX, block.flipY)

      updates.push({
        blockKey: block.blockKey,
        gridX: block.gridX,
        gridY: block.gridY,
        rotation: block.blockRotation,
        flipX: flipX,
        flipY: block.flipY,
        zOrder: block.zOrder
      })

      if (this.selectedBlocks.size > 1) {
        continue
      }

      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(block.blockKey, {
          flipX: flipX
        })
      }
    }

    if (updates.length > 1 && this.onBlocksUpdatedCallback) {
      this.onBlocksUpdatedCallback(updates)
    }
  }

  flipPhantomBlockHorizontal() {
    if (!this.phantomBlock) return

    this.phantomBlockFlipX = !this.phantomBlockFlipX
    this.phantomBlock.setFlipX(this.phantomBlockFlipX)
  }

  flipSelectedBlockVertical() {
    if (this.selectedBlocks.size === 0) return

    const updates = []

    for (const block of this.selectedBlocks) {
      const flipY = !block.flipY
      block.updateFlip(block.flipX, flipY)

      updates.push({
        blockKey: block.blockKey,
        gridX: block.gridX,
        gridY: block.gridY,
        rotation: block.blockRotation,
        flipX: block.flipX,
        flipY: flipY,
        zOrder: block.zOrder
      })

      if (this.selectedBlocks.size > 1) {
        continue
      }

      if (this.onBlockUpdatedCallback) {
        this.onBlockUpdatedCallback(block.blockKey, {
          flipY: flipY
        })
      }
    }

    if (updates.length > 1 && this.onBlocksUpdatedCallback) {
      this.onBlocksUpdatedCallback(updates)
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

  setSelectionMode(isEnabled = true) {
    this.selectionMode = isEnabled

    if (!isEnabled && this.isSelectionDragging) {
      this.finishSelectionMarquee()
    }
  }

  clearSelectionVisual(block) {
    block.setAlpha(1)
    block.clearTint()

    if (block._originalDepth !== undefined) {
      block.setDepth(block._originalDepth)
      delete block._originalDepth
    }
  }

  applySelectionVisual(block, index = 0) {
    if (block._originalDepth === undefined) {
      block._originalDepth = block.depth
    }

    block.setDepth(10000 + index)
    block.setAlpha(0.8)
    block.setTintFill(0x999933)
  }

  setSelectedBlocks(blocks, options = {}) {
    const { notify = true } = options

    for (const block of this.selectedBlocks) {
      this.clearSelectionVisual(block)
    }

    this.selectedBlocks.clear()

    for (const block of blocks) {
      if (!block) continue
      this.selectedBlocks.add(block)
    }

    this.selectedBlock = blocks[0] || null

    Array.from(this.selectedBlocks).forEach((block, index) => {
      this.applySelectionVisual(block, index)
    })

    if (!notify) {
      return
    }

    if (this.selectedBlocks.size > 0) {
      if (this.onBlockSelectedCallback) {
        this.onBlockSelectedCallback(this.selectedBlock?.blockKey, this.selectedBlocks.size)
      }
      return
    }

    if (this.onBlockDeselectedCallback) {
      this.onBlockDeselectedCallback()
    }
  }

  clearSelection(options = {}) {
    this.setSelectedBlocks([], options)
  }

  toggleBlockSelection(block) {
    if (!block) {
      return
    }

    const nextSelection = new Set(this.selectedBlocks)

    if (nextSelection.has(block)) {
      nextSelection.delete(block)
    } else {
      nextSelection.add(block)
    }

    this.setSelectedBlocks(Array.from(nextSelection))
  }

  addBlockToSelection(block) {
    if (!block || this.selectedBlocks.has(block)) {
      return
    }

    this.setSelectedBlocks([...this.selectedBlocks, block])
  }

  startSelectionMarquee(pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    this.selectionStartWorldPoint = worldPoint
    this.selectionCurrentWorldPoint = worldPoint
    this.isSelectionDragging = true
    this.shouldAppendSelection = this.isMultiSelectModifierActive(pointer)

    if (!this.shouldAppendSelection) {
      this.clearSelection()
    }

    this.drawSelectionMarquee()
  }

  updateSelectionMarquee(pointer) {
    this.selectionCurrentWorldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    this.drawSelectionMarquee()
  }

  finishSelectionMarquee() {
    const rect = this.getSelectionRectangle()
    this.isSelectionDragging = false

    if (rect) {
      this.selectBlocksInRectangle(rect)
    }

    this.selectionStartWorldPoint = null
    this.selectionCurrentWorldPoint = null
    this.shouldAppendSelection = false
    this.selectionGraphics.clear()
  }

  getSelectionRectangle() {
    if (!this.selectionStartWorldPoint || !this.selectionCurrentWorldPoint) {
      return null
    }

    const x = Math.min(this.selectionStartWorldPoint.x, this.selectionCurrentWorldPoint.x)
    const y = Math.min(this.selectionStartWorldPoint.y, this.selectionCurrentWorldPoint.y)
    const width = Math.abs(this.selectionCurrentWorldPoint.x - this.selectionStartWorldPoint.x)
    const height = Math.abs(this.selectionCurrentWorldPoint.y - this.selectionStartWorldPoint.y)

    return new Phaser.Geom.Rectangle(x, y, width, height)
  }

  drawSelectionMarquee() {
    const rect = this.getSelectionRectangle()
    this.selectionGraphics.clear()

    if (!rect) {
      return
    }

    const strokeWidth = 2 / this.cameras.main.zoom
    this.selectionGraphics.lineStyle(strokeWidth, 0xffffff, 1)
    this.selectionGraphics.fillStyle(0xffffff, 0.08)
    this.selectionGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height)
    this.selectionGraphics.fillRect(rect.x, rect.y, rect.width, rect.height)
  }

  selectBlocksInRectangle(rect) {
    const selectedBlocks = Array.from(this.blocks.values()).filter((block) => {
      const bounds = block.getBounds()

      return (
        bounds.x >= rect.x &&
        bounds.y >= rect.y &&
        bounds.right <= rect.right &&
        bounds.bottom <= rect.bottom
      )
    })

    if (this.shouldAppendSelection) {
      const mergedSelection = new Set(this.selectedBlocks)

      for (const block of selectedBlocks) {
        mergedSelection.add(block)
      }

      this.setSelectedBlocks(Array.from(mergedSelection))
      return
    }

    this.setSelectedBlocks(selectedBlocks)
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

  setOnBlocksUpdated(callback) {
    this.onBlocksUpdatedCallback = callback
  }

  setOnBlockPlacementCancelled(callback) {
    this.onBlockPlacementCancelledCallback = callback
  }
}
