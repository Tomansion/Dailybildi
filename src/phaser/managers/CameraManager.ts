export class CameraManager {
  private scene: Phaser.Scene
  private camera: Phaser.Cameras.Scene2D.Camera
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.setupCamera()
  }

  private setupCamera() {
    // Set zoom limits
    this.camera.setZoom(1)

    // Enable camera bounds (very large for infinite feel)
    const bound = 10000 * 64 // CAMERA_BOUNDS * BLOCK_SIZE
    this.camera.setBounds(-bound, -bound, bound * 2, bound * 2)

    // Setup input
    this.setupMiddleClickDrag()
    this.setupZoom()
  }

  private setupMiddleClickDrag() {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.isDragging = true
        this.dragStartX = pointer.x + this.camera.scrollX
        this.dragStartY = pointer.y + this.camera.scrollY
      }
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.middleButtonDown()) {
        const newScrollX = this.dragStartX - pointer.x
        const newScrollY = this.dragStartY - pointer.y
        this.camera.setScroll(newScrollX, newScrollY)
      }
    })

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.middleButtonDown()) {
        this.isDragging = false
      }
    })
  }

  private setupZoom() {
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
      const zoomAmount = deltaY > 0 ? -0.1 : 0.1
      const newZoom = Phaser.Math.Clamp(
        this.camera.zoom + zoomAmount,
        0.5,
        2.0
      )

      // Zoom towards mouse position
      const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y)
      const oldZoom = this.camera.zoom
      
      this.camera.setZoom(newZoom)
      
      // Adjust camera position to zoom towards cursor
      const newWorldPoint = this.camera.getWorldPoint(pointer.x, pointer.y)
      this.camera.scrollX -= newWorldPoint.x - worldPoint.x
      this.camera.scrollY -= newWorldPoint.y - worldPoint.y
    })
  }

  centerOn(x: number, y: number) {
    this.camera.centerOn(x, y)
  }

  goHome() {
    this.centerOn(0, 0)
  }
}
