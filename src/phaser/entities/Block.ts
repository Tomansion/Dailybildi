import * as Phaser from 'phaser'
import{ GridManager } from '../managers/GridManager'
import { PlacedBlockWithData } from '@/types/world'

export class Block extends Phaser.GameObjects.Sprite {
  public blockKey: string
  public blockCatalogKey: string
  public gridX: number
  public gridY: number
  public blockRotation: number // Store separately from Phaser angle
  public zOrder: number
  public layer: number

  constructor(
    scene: Phaser.Scene,
    blockData: PlacedBlockWithData
  ) {
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
    // alphaTolerance: only pixels with alpha > 1 are considered clickable
    this.setInteractive({
      draggable: true,
      useHandCursor: true,
      pixelPerfect: true,
      alphaTolerance: 1
    })

    scene.add.existing(this)
  }

  updatePosition(gridX: number, gridY: number) {
    this.gridX = gridX
    this.gridY = gridY
    const pos = GridManager.gridToPixels(gridX, gridY)
    this.setPosition(pos.x, pos.y)
  }

  updateRotation(rotation: number) {
    this.blockRotation = rotation
    this.setAngle(rotation)
  }

  updateFlip(flipX: boolean, flipY: boolean) {
    this.setFlipX(flipX)
    this.setFlipY(flipY)
  }
}
