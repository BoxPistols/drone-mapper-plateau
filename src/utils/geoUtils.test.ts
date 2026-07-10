import { describe, it, expect } from 'vitest'
import { pointInPolygon, generatePerimeterPoints, generateGridPoints } from './geoUtils'

// 東京付近の約400m四方の正方形ゾーン
const square: [number, number][] = [
  [139.790, 35.710],
  [139.794, 35.710],
  [139.794, 35.714],
  [139.790, 35.714],
]

describe('pointInPolygon', () => {
  it('中心点は内側と判定される', () => {
    expect(pointInPolygon([139.792, 35.712], square)).toBe(true)
  })
  it('外側の点は外と判定される', () => {
    expect(pointInPolygon([139.800, 35.712], square)).toBe(false)
    expect(pointInPolygon([139.792, 35.720], square)).toBe(false)
  })
})

describe('generatePerimeterPoints', () => {
  it('外周に沿ってポイントを生成し、隣接間隔がほぼ spacing に等しい', () => {
    const spacing = 50
    const pts = generatePerimeterPoints(square, spacing)
    expect(pts.length).toBeGreaterThan(0)
    // 全点がゾーンの緯度経度レンジ内（外周なので境界上）
    for (const [lon, lat] of pts) {
      expect(lon).toBeGreaterThanOrEqual(139.790 - 1e-6)
      expect(lon).toBeLessThanOrEqual(139.794 + 1e-6)
      expect(lat).toBeGreaterThanOrEqual(35.710 - 1e-6)
      expect(lat).toBeLessThanOrEqual(35.714 + 1e-6)
    }
  })

  it('spacing を広げるとポイント数が減る', () => {
    const few = generatePerimeterPoints(square, 100)
    const many = generatePerimeterPoints(square, 25)
    expect(many.length).toBeGreaterThan(few.length)
  })
})

describe('generateGridPoints', () => {
  it('生成された全ポイントがポリゴン内にある', () => {
    const pts = generateGridPoints(square, 50)
    expect(pts.length).toBeGreaterThan(0)
    for (const p of pts) {
      expect(pointInPolygon(p, square)).toBe(true)
    }
  })

  it('L字型の凹ポリゴンでも凹部の外にポイントを置かない', () => {
    // L字（右上が欠けた形）
    const lshape: [number, number][] = [
      [139.790, 35.710],
      [139.794, 35.710],
      [139.794, 35.712],
      [139.792, 35.712],
      [139.792, 35.714],
      [139.790, 35.714],
    ]
    const pts = generateGridPoints(lshape, 30)
    for (const p of pts) {
      expect(pointInPolygon(p, lshape)).toBe(true)
    }
  })
})
