import { BLOCK_SIZE, GRID_SIZE, CAMERA_BOUNDS } from '@/lib/constants'

export class GridManager {
  static readonly BLOCK_SIZE = BLOCK_SIZE
  static readonly GRID_SIZE = GRID_SIZE
  static readonly CAMERA_BOUNDS = CAMERA_BOUNDS

  static gridToPixels(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.GRID_SIZE,
      y: gridY * this.GRID_SIZE,
    }
  }

  static pixelsToGrid(x: number, y: number): { gridX: number; gridY: number } {
    return {
      gridX: Math.round(x / this.GRID_SIZE),
      gridY: Math.round(y / this.GRID_SIZE),
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
