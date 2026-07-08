import { BLOCK_SIZE, CAMERA_BOUNDS } from "@/lib/constants";

export class GridManager {
  static _blockSize = BLOCK_SIZE;
  static CAMERA_BOUNDS = CAMERA_BOUNDS;

  static getGridSize(blockSize = this._blockSize) {
    return blockSize / 4;
  }

  static get BLOCK_SIZE() {
    return this._blockSize;
  }

  static get GRID_SIZE() {
    return this.getGridSize();
  }

  static configure(blockSize) {
    this._blockSize = blockSize;
  }

  static gridToPixels(gridX, gridY) {
    return {
      x: gridX * this.GRID_SIZE,
      y: gridY * this.GRID_SIZE,
    };
  }

  static pixelsToGrid(x, y) {
    return {
      gridX: Math.round(x / this.GRID_SIZE),
      gridY: Math.round(y / this.GRID_SIZE),
    };
  }

  static snapToGrid(x, y) {
    const grid = this.pixelsToGrid(x, y);
    return this.gridToPixels(grid.gridX, grid.gridY);
  }

  static isWithinBounds(gridX, gridY) {
    return (
      Math.abs(gridX) <= this.CAMERA_BOUNDS &&
      Math.abs(gridY) <= this.CAMERA_BOUNDS
    );
  }
}
