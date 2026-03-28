import { BLOCK_SIZE, CAMERA_BOUNDS } from '@/lib/constants'

export class GridManager {
  private static _blockSize = BLOCK_SIZE
  private static _gridSize = BLOCK_SIZE / 2
  static readonly CAMERA_BOUNDS = CAMERA_BOUNDS

  static get BLOCK_SIZE() {
    return this._blockSize
  }

  static get GRID_SIZE() {
    return this._gridSize
  }

  static configure(blockSize: number) {
    this._blockSize = blockSize
    this._gridSize = blockSize / 2
  }

  static gridToPixels(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this._gridSize,
      y: gridY * this._gridSize,
    }
  }

  static pixelsToGrid(x: number, y: number): { gridX: number; gridY: number } {
    return {
      gridX: Math.round(x / this._gridSize),
      gridY: Math.round(y / this._gridSize),
    }
  }

  static snapToGrid(x: number, y: number): { x: number; y: number } {
    const grid = this.pixelsToGrid(x, y)
    return this.gridToPixels(grid.gridX, grid.gridY)
  }

  static isWithinBounds(gridX: number, gridY: number): boolean {
    return (
      Math.abs(gridX) <= this.CAMERA_BOUNDS &&
      Math.abs(gridY) <= this.CAMERA_BOUNDS
    )
  }
}
