import { describe, it, expect } from 'vitest'
import { catmullRom, catmullRomTangent, mirrorPoint } from './spline'

const P = (lon: number, lat: number, altAGL = 0) => ({ lon, lat, altAGL })

describe('catmullRom', () => {
  it('t=0 で p1、t=1 で p2 を正確に通過する（補間の要件）', () => {
    const p0 = P(0, 0), p1 = P(1, 1, 10), p2 = P(2, 3, 20), p3 = P(4, 4, 30)
    const at0 = catmullRom(p0, p1, p2, p3, 0)
    const at1 = catmullRom(p0, p1, p2, p3, 1)
    expect(at0.lon).toBeCloseTo(p1.lon, 10)
    expect(at0.lat).toBeCloseTo(p1.lat, 10)
    expect(at0.altAGL).toBeCloseTo(p1.altAGL, 10)
    expect(at1.lon).toBeCloseTo(p2.lon, 10)
    expect(at1.lat).toBeCloseTo(p2.lat, 10)
    expect(at1.altAGL).toBeCloseTo(p2.altAGL, 10)
  })

  it('altAGL は 0 未満にならないようクランプされる', () => {
    // 制御点を下げてオーバーシュートで負に振れる状況を作る
    const p0 = P(0, 0, 100), p1 = P(1, 0, 0), p2 = P(2, 0, 0), p3 = P(3, 0, 100)
    for (let t = 0; t <= 1; t += 0.1) {
      expect(catmullRom(p0, p1, p2, p3, t).altAGL).toBeGreaterThanOrEqual(0)
    }
  })

  it('直線上の等間隔制御点なら中点 t=0.5 は中央を返す', () => {
    const p0 = P(0, 0), p1 = P(1, 0), p2 = P(2, 0), p3 = P(3, 0)
    expect(catmullRom(p0, p1, p2, p3, 0.5).lon).toBeCloseTo(1.5, 10)
  })
})

describe('catmullRomTangent', () => {
  it('直線セグメントでは接線が進行方向（+lon）を向く', () => {
    const p0 = P(0, 0), p1 = P(1, 0), p2 = P(2, 0), p3 = P(3, 0)
    const tan = catmullRomTangent(p0, p1, p2, p3, 0.5)
    expect(tan.lon).toBeGreaterThan(0)
    expect(Math.abs(tan.lat)).toBeLessThan(1e-9)
  })

  it('高度変化がある場合、altAGL 接線が上昇/下降方向を反映する', () => {
    const up = catmullRomTangent(P(0, 0, 0), P(1, 0, 10), P(2, 0, 20), P(3, 0, 30), 0.5)
    expect(up.altAGL).toBeGreaterThan(0)
    const down = catmullRomTangent(P(0, 0, 30), P(1, 0, 20), P(2, 0, 10), P(3, 0, 0), 0.5)
    expect(down.altAGL).toBeLessThan(0)
  })
})

describe('mirrorPoint', () => {
  it('anchor を中心に other を点対称移動する', () => {
    const anchor = P(2, 2, 50), other = P(1, 1, 10)
    const m = mirrorPoint(anchor, other)
    expect(m.lon).toBeCloseTo(3, 10)
    expect(m.lat).toBeCloseTo(3, 10)
    // 高度は anchor 値を引き継ぐ（端点ミラーで高度が跳ねないように）
    expect(m.altAGL).toBe(anchor.altAGL)
  })
})
