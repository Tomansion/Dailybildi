export class CameraManager {
  private scene: Phaser.Scene
  private camera: Phaser.Cameras.Scene2D.Camera
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private readonly cameraMoveSpeed: number = 10
  private blockDragInProgress: boolean = false

  constructor(scene: Phaser.Scene, worldWidth?: number, worldHeight?: number) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.setupCamera(worldWidth, worldHeight)
  }

  // Called by MainScene when a block drag starts/ends
  setBlockDragInProgress(inProgress: boolean) {
    this.blockDragInProgress = inProgress
  }

  private setupCamera(worldWidth?: number, worldHeight?: number) {
    // Set zoom limits
    this.camera.setZoom(1)

    // Set camera bounds: 2x the world image size, or default large bounds
    let boundWidth: number
    let boundHeight: number
    
    if (worldWidth && worldHeight) {
      boundWidth = worldWidth
      boundHeight = worldHeight
    } else {
      // Fallback to large default bounds
      const defaultBound = 10000 * 64
      boundWidth = defaultBound * 2
      boundHeight = defaultBound * 2
    }
    
    this.camera.setBounds(
      -boundWidth,
      -boundHeight,
      boundWidth * 2,
      boundHeight * 2
    )

    // Setup keyboard input here, but defer pointer input to setupInput()
    this.setupArrowKeys()
  }

  setupInput() {
    // Setup pointer-based input (called after MainScene sets up its handlers)
    this.setupMiddleClickDrag()
    this.setupZoom()
  }

  private setupArrowKeys() {
    if (this.scene.input.keyboard) 
      this.cursors = this.scene.input.keyboard.createCursorKeys()
  }

  private setupMiddleClickDrag() {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't start camera drag if a block is being dragged
      if (this.blockDragInProgress) return
      
      this.isDragging = true
      this.dragStartX = pointer.x
      this.dragStartY = pointer.y
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Don't move camera if a block is being dragged
      if (this.isDragging && !this.blockDragInProgress) {
        // Scale by zoom for 1:1 feeling regardless of zoom level
        const deltaX = (this.dragStartX - pointer.x) / this.camera.zoom
        const deltaY = (this.dragStartY - pointer.y) / this.camera.zoom
        
        this.camera.scrollX += deltaX
        this.camera.scrollY += deltaY
        
        // Update drag start for next frame
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
      }
    })

    this.scene.input.on('pointerup', () => {
      this.isDragging = false
    })
  }

  private setupZoom() {
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
      const oldZoom = this.camera.zoom
      const zoomAmount = deltaY > 0 ? -0.1 : 0.1
      const newZoom = Phaser.Math.Clamp(oldZoom + zoomAmount, 0.7, 7.0)

      if (newZoom === oldZoom) return

      // Get the pointer position relative to camera center
      const centerX = this.camera.width / 2
      const centerY = this.camera.height / 2
      
      // Distance from pointer to center of screen
      const offsetX = pointer.x - centerX
      const offsetY = pointer.y - centerY
      
      // World position under cursor before zoom
      const worldX = this.camera.scrollX + offsetX / oldZoom
      const worldY = this.camera.scrollY + offsetY / oldZoom

      // Apply new zoom
      this.camera.setZoom(newZoom)

      // Adjust scroll so the same world point stays under cursor
      this.camera.scrollX = worldX - offsetX / newZoom
      this.camera.scrollY = worldY - offsetY / newZoom
    })
  }

  centerOn(x: number, y: number) {
    this.camera.centerOn(x, y)
  }

  goHome() {
    this.centerOn(0, 0)
  }

  update() {
    if (!this.cursors) return

    const speed = this.cameraMoveSpeed / this.camera.zoom

    if (this.cursors.left.isDown) {
      this.camera.scrollX -= speed
    }
    if (this.cursors.right.isDown) {
      this.camera.scrollX += speed
    }
    if (this.cursors.up.isDown) {
      this.camera.scrollY -= speed
    }
    if (this.cursors.down.isDown) {
      this.camera.scrollY += speed
    }
  }
}
