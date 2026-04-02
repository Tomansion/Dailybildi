import { BLOCK_SIZE, CAMERA_BOUNDS } from '@/lib/constants'

export class GridManager {
  static _blockSize = BLOCK_SIZE
  static _gridSize = BLOCK_SIZE / 2
  static CAMERA_BOUNDS = CAMERA_BOUNDS

  static get BLOCK_SIZE() {
    return this._blockSize
  }

  static get GRID_SIZE() {
    return this._gridSize
  }

  static configure(blockSize) {
    this._blockSize = blockSize
    this._gridSize = blockSize / 4
  }

  static gridToPixels(gridX, gridY) {
    return {
      x: gridX * this._gridSize,
      y: gridY * this._gridSize,
    }
  }

  static pixelsToGrid(x, y) {
    return {
      gridX: Math.round(x / this._gridSize),
      gridY: Math.round(y / this._gridSize),
    }
  }

  static snapToGrid(x, y) {
    const grid = this.pixelsToGrid(x, y)
    return this.gridToPixels(grid.gridX, grid.gridY)
  }

  static isWithinBounds(gridX, gridY) {
    return (
      Math.abs(gridX) <= this.CAMERA_BOUNDS &&
      Math.abs(gridY) <= this.CAMERA_BOUNDS
    )
  }
}
