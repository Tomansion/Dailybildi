import * as Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import { PhaserConfig } from './config'

export class PhaserGameWrapper {
  private game: Phaser.Game | null = null
  private mainScene: MainScene | null = null

  initialize(parent: string) {
    if (this.game) {
      return
    }

    const config = {
      ...PhaserConfig,
      parent,
      scene: [MainScene],
    }

    this.game = new Phaser.Game(config)
    
    // Prevent browser context menu on right-click
    this.game.canvas.oncontextmenu = function (e) { e.preventDefault() }
    
    // Get scene reference
    this.game.events.once('ready', () => {
      this.mainScene = this.game!.scene.getScene('MainScene') as MainScene
    })
  }

  getMainScene(): MainScene | null {
    return this.mainScene
  }

  destroy() {
    if (this.game) {
      this.game.destroy(true)
      this.game = null
      this.mainScene = null
    }
  }
}
