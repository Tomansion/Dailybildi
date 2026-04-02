import Phaser from 'phaser'
import { GridManager } from '../managers/GridManager'

export class Block extends Phaser.GameObjects.Sprite {
  constructor(scene, blockData) {
    const pos = GridManager.gridToPixels(blockData.gridX, blockData.gridY)

    super(
      scene,
      pos.x,
      pos.y,
      `block_${blockData.blockData.id}_${blockData.blockData.layer}_${blockData.blockData.rarity}`
    )

    this.blockKey = blockData._key
    this.blockCatalogKey = blockData.blockCatalogKey
    this.gridX = blockData.gridX
    this.gridY = blockData.gridY
    this.blockRotation = blockData.rotation
    this.zOrder = blockData.zOrder
    this.layer = blockData.blockData.layer

    // Set visual properties
    this.setOrigin(0.5, 0.5)
    this.setAngle(blockData.rotation)
    this.setFlipX(blockData.flipX)
    this.setFlipY(blockData.flipY)
    this.setDepth(this.layer * 1000 + this.zOrder)

    // Make interactive with pixel-perfect hit detection
    this.setInteractive({
      draggable: true,
      useHandCursor: true,
      pixelPerfect: true,
      alphaTolerance: 1
    })

    scene.add.existing(this)
  }

  updatePosition(gridX, gridY) {
    this.gridX = gridX
    this.gridY = gridY
    const pos = GridManager.gridToPixels(gridX, gridY)
    this.setPosition(pos.x, pos.y)
  }

  updateRotation(rotation) {
    this.blockRotation = rotation
    this.setAngle(rotation)
  }

  updateFlip(flipX, flipY) {
    this.setFlipX(flipX)
    this.setFlipY(flipY)
  }
}
