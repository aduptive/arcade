import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Pixel-art chibi spritesheet: 23 frames wide x 4 characters tall, each 32x32.
    // Row 0: orange dude, Row 1: royal (king/crown), Row 2: green soldier,
    // Row 3: green mini (only the first few frames are populated).
    // Source: OpenGameArt free download.
    // Path is server-root absolute — works in dev. Production deployment to
    // portals may need adjusting based on the host's base URL.
    this.load.spritesheet('characters', '/sprites/characters.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
  }

  create() {
    this.scene.start('MenuScene')
  }
}
