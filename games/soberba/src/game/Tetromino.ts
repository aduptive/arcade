import Phaser from 'phaser'

export type ShapeKey = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export const SHAPES: Record<ShapeKey, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[1, 1, 1], [0, 1, 0]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
}

export const SHAPE_COLORS: Record<ShapeKey, number> = {
  I: 0xc9b89a,
  O: 0xb89c7e,
  T: 0xa89576,
  S: 0xa8a29a,
  Z: 0x8a7556,
  J: 0x937e5e,
  L: 0xc0a888,
}

export const SHAPE_EDGE_COLORS: Record<ShapeKey, number> = {
  I: 0x7a6d54,
  O: 0x6e5a40,
  T: 0x645333,
  S: 0x5e5a52,
  Z: 0x4d3f2a,
  J: 0x55452f,
  L: 0x705e44,
}

export const ALL_SHAPES: ShapeKey[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

export const BLOCK_SIZE = 32

export interface SpawnedPiece {
  body: MatterJS.BodyType
  shape: ShapeKey
  graphics: Phaser.GameObjects.Graphics
}

export function randomShape(): ShapeKey {
  return ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)]
}

export function spawnTetromino(scene: Phaser.Scene, shape: ShapeKey, x: number, y: number): SpawnedPiece {
  const matrix = SHAPES[shape]
  const rows = matrix.length
  const cols = matrix[0].length
  const offsetX = -((cols - 1) * BLOCK_SIZE) / 2
  const offsetY = -((rows - 1) * BLOCK_SIZE) / 2

  const M = scene.matter
  const Bodies = M.bodies
  const Body = M.body

  const parts: MatterJS.BodyType[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === 1) {
        const px = x + offsetX + c * BLOCK_SIZE
        const py = y + offsetY + r * BLOCK_SIZE
        parts.push(Bodies.rectangle(px, py, BLOCK_SIZE, BLOCK_SIZE, { chamfer: { radius: 2 } }))
      }
    }
  }

  const compound = Body.create({
    parts,
    friction: 0.6,
    frictionStatic: 0.8,
    restitution: 0.05,
    density: 0.002,
  })

  M.world.add(compound)

  const graphics = scene.add.graphics()
  return { body: compound, shape, graphics }
}

export function renderPiece(piece: SpawnedPiece) {
  const { graphics, body, shape } = piece
  graphics.clear()
  const fill = SHAPE_COLORS[shape]
  const edge = SHAPE_EDGE_COLORS[shape]
  for (const part of body.parts) {
    if (part === body) continue
    const verts = part.vertices
    if (!verts || verts.length === 0) continue
    graphics.fillStyle(fill, 1)
    graphics.lineStyle(2, edge, 1)
    graphics.beginPath()
    graphics.moveTo(verts[0].x, verts[0].y)
    for (let i = 1; i < verts.length; i++) graphics.lineTo(verts[i].x, verts[i].y)
    graphics.closePath()
    graphics.fillPath()
    graphics.strokePath()
  }
}
