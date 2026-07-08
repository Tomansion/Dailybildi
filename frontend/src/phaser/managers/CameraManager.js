import { CAMERA_ZOOM, changeCameraZoom, setCameraZoom } from '../utils/zoom'

export class CameraManager {
  constructor(scene, worldWidth, worldHeight) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.pinch = null
    this.isDragging = false
    this.isPinching = false
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
    setCameraZoom(this.camera, CAMERA_ZOOM.initial)

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
    this.scene.input.addPointer(1)
    this.setupMiddleClickDrag()
    this.setupZoom()
    this.setupPinchZoom()
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
      if (this.isMultiTouchActive()) return

      this.isDragging = true
      this.dragStartX = pointer.x
      this.dragStartY = pointer.y
    })

    this.scene.input.on('pointermove', (pointer) => {
      // Don't move camera if a block is being dragged
      if (this.isDragging && !this.blockDragInProgress && !this.isPinching) {
        // Scale by zoom for 1:1 feeling regardless of zoom level
        const deltaX = (this.dragStartX - pointer.x) / this.camera.zoom
        const deltaY = (this.dragStartY - pointer.y) / this.camera.zoom

        this.camera.scrollX += deltaX +0.5 
        this.camera.scrollY += deltaY +0.5 

        // Update drag start for next frame to get smooth incremental movement
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
      }
    })

    this.scene.input.on('pointerup', () => {
      if (!this.isMultiTouchActive()) this.isDragging = false
    })
  }

  setupZoom() {
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const zoomDelta = deltaY > 0 ? -CAMERA_ZOOM.wheelStep : CAMERA_ZOOM.wheelStep
      this.setZoom(this.camera.zoom + zoomDelta, pointer)
    })
  }

  setupPinchZoom() {
    const pinchPlugin = this.scene.plugins.get('rexpinchplugin')

    if (!pinchPlugin) {
      return
    }

    this.pinch = pinchPlugin.add(this.scene, { threshold: 0 })

    this.pinch.on('drag2start', () => {
      if (this.blockDragInProgress) return

      this.isDragging = false
      this.isPinching = true
    })

    this.pinch.on('drag2', (pinch) => {
      if (this.blockDragInProgress) return

      this.isDragging = false
      this.isPinching = true
      this.camera.scrollX -= pinch.movementCenterX / this.camera.zoom
      this.camera.scrollY -= pinch.movementCenterY / this.camera.zoom
    })

    this.pinch.on('pinch', (pinch) => {
      if (this.blockDragInProgress) return

      const pinchCenter = {
        x: pinch.centerX,
        y: pinch.centerY,
      }

      this.setZoom(this.camera.zoom * pinch.scaleFactor, pinchCenter, { snap: false })
    })

    this.pinch.on('drag2end', () => {
      this.stopPinch()
    })

    this.pinch.on('pinchend', () => {
      this.stopPinch()
    })
  }

  getActiveTouchPointers() {
    if (this.pinch?.pointers?.length) {
      return this.pinch.pointers.filter(
        (pointer) => pointer.pointerType === 'touch' && pointer.isDown
      )
    }

    return this.scene.input.manager.pointers.filter(
      (pointer) => pointer.pointerType === 'touch' && pointer.isDown
    )
  }

  isMultiTouchActive() {
    return this.getActiveTouchPointers().length >= 2
  }

  isTouchGestureActive() {
    return this.isPinching || this.isMultiTouchActive()
  }

  stopPinch() {
    this.isPinching = false
  }

  setZoom(zoom, pointer = null, options = {}) {
    return setCameraZoom(this.camera, zoom, pointer, options)
  }

  zoomIn() {
    return changeCameraZoom(this.camera, CAMERA_ZOOM.buttonStep)
  }

  zoomOut() {
    return changeCameraZoom(this.camera, -CAMERA_ZOOM.buttonStep)
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
