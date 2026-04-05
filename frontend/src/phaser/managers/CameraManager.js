import Phaser from 'phaser'

export class CameraManager {
  constructor(scene, worldWidth, worldHeight) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.isDragging = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.cursors = null
    this.cameraMoveSpeed = 10
    this.blockDragInProgress = false

    this.setupCamera(worldWidth, worldHeight)
  }

  // Called by MainScene when a block drag starts/ends
  setBlockDragInProgress(inProgress) {
    this.blockDragInProgress = inProgress
  }

  setupCamera(worldWidth, worldHeight) {
    // Set zoom limits
    this.camera.setZoom(1)

    // Set camera bounds: 2x the world image size, or default large bounds
    let boundWidth
    let boundHeight

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

  setupArrowKeys() {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys()
    }
  }

  setupMiddleClickDrag() {
    this.scene.input.on('pointerdown', (pointer) => {
      // Don't start camera drag if a block is being dragged
      if (this.blockDragInProgress) return

      this.isDragging = true
      this.dragStartX = pointer.x
      this.dragStartY = pointer.y
    })

    this.scene.input.on('pointermove', (pointer) => {
      // Don't move camera if a block is being dragged
      if (this.isDragging && !this.blockDragInProgress) {
        // Scale by zoom for 1:1 feeling regardless of zoom level
        const deltaX = (this.dragStartX - pointer.x) / this.camera.zoom
        const deltaY = (this.dragStartY - pointer.y) / this.camera.zoom

        this.camera.scrollX += deltaX
        this.camera.scrollY += deltaY

        // Update drag start for next frame to get smooth incremental movement
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
      }
    })

    this.scene.input.on('pointerup', () => {
      this.isDragging = false
    })
  }

  setupZoom() {
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const oldZoom = this.camera.zoom
      const zoomAmount = deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.7, Math.min(7.0, oldZoom + zoomAmount))

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

  zoomIn() {
    const newZoom = Math.min(7.0, this.camera.zoom + 0.5)
    this.camera.setZoom(newZoom)
  }

  zoomOut() {
    const newZoom = Math.max(0.7, this.camera.zoom - 0.5)
    this.camera.setZoom(newZoom)
  }

  centerOn(x, y) {
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
