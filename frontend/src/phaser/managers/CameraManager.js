import { CAMERA_ZOOM, changeCameraZoom, setCameraZoom } from '../utils/zoom'

export class CameraManager {
  constructor(scene, worldWidth, worldHeight) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.isDragging = false
    this.isPinching = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.pinchStartDistance = 0
    this.pinchStartZoom = CAMERA_ZOOM.initial
    this.pinchCenterX = 0
    this.pinchCenterY = 0
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
    this.scene.input.on('pointerdown', () => {
      const activeTouches = this.getActiveTouchPointers()

      if (activeTouches.length >= 2) {
        this.startPinch(activeTouches[0], activeTouches[1])
      }
    })

    this.scene.input.on('pointermove', () => {
      if (this.blockDragInProgress) return

      const activeTouches = this.getActiveTouchPointers()

      if (activeTouches.length < 2) {
        if (this.isPinching) {
          this.stopPinch()
        }
        return
      }

      if (!this.isPinching) {
        this.startPinch(activeTouches[0], activeTouches[1])
      }

      this.updatePinch(activeTouches[0], activeTouches[1])
    })

    this.scene.input.on('pointerup', () => {
      if (this.getActiveTouchPointers().length < 2) {
        this.stopPinch()
      }
    })
  }

  getActiveTouchPointers() {
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

  getPointerDistance(pointerA, pointerB) {
    return Math.hypot(pointerB.x - pointerA.x, pointerB.y - pointerA.y)
  }

  getPinchCenter(pointerA, pointerB) {
    return {
      x: (pointerA.x + pointerB.x) / 2,
      y: (pointerA.y + pointerB.y) / 2,
    }
  }

  startPinch(pointerA, pointerB) {
    this.isPinching = true
    this.isDragging = false
    this.pinchStartDistance = this.getPointerDistance(pointerA, pointerB)
    this.pinchStartZoom = this.camera.zoom
    const pinchCenter = this.getPinchCenter(pointerA, pointerB)
    this.pinchCenterX = pinchCenter.x
    this.pinchCenterY = pinchCenter.y
  }

  updatePinch(pointerA, pointerB) {
    if (!this.pinchStartDistance) return

    const currentDistance = this.getPointerDistance(pointerA, pointerB)

    if (!currentDistance) return

    const pinchCenter = this.getPinchCenter(pointerA, pointerB)

    const zoomRatio = currentDistance / this.pinchStartDistance
    this.setZoom(this.pinchStartZoom * zoomRatio, pinchCenter)

    const deltaX = (this.pinchCenterX - pinchCenter.x) / this.camera.zoom
    const deltaY = (this.pinchCenterY - pinchCenter.y) / this.camera.zoom

    this.camera.scrollX += deltaX
    this.camera.scrollY += deltaY

    this.pinchStartDistance = currentDistance
    this.pinchStartZoom = this.camera.zoom
    this.pinchCenterX = pinchCenter.x
    this.pinchCenterY = pinchCenter.y
  }

  stopPinch() {
    this.isPinching = false
    this.pinchStartDistance = 0
    this.pinchStartZoom = this.camera.zoom
    this.pinchCenterX = 0
    this.pinchCenterY = 0
  }

  setZoom(zoom, pointer = null) {
    return setCameraZoom(this.camera, zoom, pointer)
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
