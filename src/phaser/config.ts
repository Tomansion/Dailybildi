import type * as Phaser from 'phaser'

export const PhaserConfig: Phaser.Types.Core.GameConfig = {
  type: 0, // Phaser.AUTO
  backgroundColor: 'transparent',
  parent: 'phaser-container',
  scale: {
    mode: 2, // Phaser.Scale.RESIZE
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
}
