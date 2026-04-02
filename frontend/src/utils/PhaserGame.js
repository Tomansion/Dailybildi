import Phaser from 'phaser'

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' })
    this.grid = null
    this.placedBlocks = new Map()
    this.selectedBlock = null
    this.camera = null
  }

  create() {
    // Create a grid layer
    this.createGrid()

    // Setup camera controls
    this.setupCamera()

    // Setup input
    this.setupInput()

    // Listen for block selection events
    this.events.on('select_block', (block) => {
      this.selectedBlock = block
    })
  }

  createGrid() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false })
    const gridSize = 32
    const width = this.sys.game.config.width
    const height = this.sys.game.config.height

    graphics.fillStyle(0x1a1a1a, 1)
    graphics.fillRect(0, 0, width * 2, height * 2)

    graphics.lineStyle(1, 0x333333, 0.5)
    for (let x = 0; x < width * 2; x += gridSize) {
      graphics.lineBetween(x, 0, x, height * 2)
    }
    for (let y = 0; y < height * 2; y += gridSize) {
      graphics.lineBetween(0, y, width * 2, y)
    }

    graphics.generateTexture('grid', width * 2, height * 2)
    graphics.destroy()

    this.grid = this.add.tileSprite(0, 0, width, height, 'grid')
  }

  setupCamera() {
    this.camera = this.cameras.main
    this.camera.setBounds(-10000, -10000, 20000, 20000)
  }

  setupInput() {
    // Middle mouse button to pan
    this.input.on('pointermove', (pointer) => {
      if (pointer.middleButtonDown()) {
        this.camera.scrollX -= pointer.velocity.x
        this.camera.scrollY -= pointer.velocity.y
      }
    })

    // Scroll wheel to zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const factor = deltaY > 0 ? 0.95 : 1.05
      const zoom = this.camera.zoom * factor
      this.camera.setZoom(Math.max(0.5, Math.min(3, zoom)))
    })
  }

  placeBlock(x, y, zOrder, blockData) {
    if (!this.selectedBlock) {
      return
    }

    // Create a visual representation of the block
    const block = this.add.rectangle(x, y, 32, 32, 0x3b82f6)
    block.setOrigin(0)
    block.setDepth(zOrder)
    block.setStrokeStyle(2, 0x1e40af)
    block.setInteractive()

    // Enable drag
    this.input.setDraggable(block)

    // Store block data
    const blockKey = `${x}_${y}`
    this.placedBlocks.set(blockKey, {
      gameObject: block,
      data: blockData,
      x,
      y,
      zOrder,
      rotation: 0,
      flipX: false,
      flipY: false
    })

    return block
  }

  update() {
    if (this.grid) {
      this.grid.tilePositionX = this.camera.scrollX * 0.1
      this.grid.tilePositionY = this.camera.scrollY * 0.1
    }
  }
}

export default class PhaserGame {
  constructor(container) {
    const config = {
      type: Phaser.AUTO,
      parent: container,
      width: container.clientWidth,
      height: container.clientHeight,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: MainScene,
      backgroundColor: '#0f172a'
    }

    this.game = new Phaser.Game(config)
    this.scene = this.game.scene.scenes[0]

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize(container))
  }

  handleResize(container) {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight
    this.game.scale.resize(newWidth, newHeight)
  }

  placeBlock(x, y, zOrder, blockData) {
    return this.scene.placeBlock(x, y, zOrder, blockData)
  }

  destroy() {
    this.game.destroy(true)
  }
}
