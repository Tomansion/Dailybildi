import * as Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'

export class PhaserGameWrapper {
  constructor() {
    this.game = null
    this.mainScene = null
  }

  initialize(parent) {
    if (this.game) {
      return
    }

    // Get the actual DOM element if a string ID is passed
    const parentElement = typeof parent === 'string' ? document.getElementById(parent) : parent

    if (!parentElement) {
      console.error(`Parent element not found: ${parent}`)
      return
    }

    const config = {
      type: Phaser.AUTO,
      backgroundColor: 'transparent',
      parent: parentElement,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      render: {
        pixelArt: true,
        antialias: false,
      },
      scene: [MainScene],
    }

    this.game = new Phaser.Game(config)

    // Prevent browser context menu on right-click
    this.game.canvas.oncontextmenu = function (e) {
      e.preventDefault()
    }

    // Get scene reference
    this.game.events.once('ready', () => {
      this.mainScene = this.game.scene.getScene('MainScene')
    })
  }

  getMainScene() {
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
