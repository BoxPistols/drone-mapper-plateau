import { describe, it, expect } from 'vitest'
import {
  buildFlightPhases, totalFlightMs, totalFlightDistanceM,
  sampleAtElapsed, splineSample, computeFlightStats,
} from './flightPath'
import type { Waypoint } from '../types'

let idc = 0
function wp(lon: number, lat: number, altAGL: number, speedMS: number, extra: Partial<Waypoint> = {}): Waypoint {
  return { id: `wp${idc++}`, lon, lat, altAGL, groundAlt: 0, speedMS, action: 'none', ...extra }
}

// サンプルデータ相当の6WPコース（ホバー含む）
function sampleCourse(): Waypoint[] {
  return [
    wp(139.7940, 35.7110, 30, 5),
    wp(139.7980, 35.7130, 60, 8, { action: 'photo' }),
    wp(139.8020, 35.7160, 100, 10),
    wp(139.8010, 35.7195, 80, 8, { action: 'photo' }),
    wp(139.7960, 35.7180, 50, 5, { action: 'hover', hoverSec: 10 }),
    wp(139.7940, 35.7110, 30, 5),
  ]
}

// 3次元メートル距離（cos(lat)補正）
function distM(a: { lon: number; lat: number; altAGL: number }, b: { lon: number; lat: number; altAGL: number }) {
  const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
  const dy = (b.lat - a.lat) * 110540
  const dz = b.altAGL - a.altAGL
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

describe('buildFlightPhases', () => {
  it('N個のWPから N-1 個の fly フェーズを生成する（ホバーは追加分）', () => {
    const wps = sampleCourse()
    const phases = buildFlightPhases(wps)
    const flys = phases.filter((p) => p.type === 'fly')
    const hovers = phases.filter((p) => p.type === 'hover')
    expect(flys.length).toBe(wps.length - 1)
    expect(hovers.length).toBe(1) // WP5 のホバーのみ
  })

  it('最終WPのホバーはフェーズ化しない', () => {
    const wps = [wp(139, 35, 30, 5), wp(139.001, 35, 30, 5, { action: 'hover', hoverSec: 5 })]
    const phases = buildFlightPhases(wps)
    expect(phases.some((p) => p.type === 'hover')).toBe(false)
  })

  it('fly フェーズの所要時間 = 弧長 / 速度（等速の要件）', () => {
    const wps = [wp(139, 35, 50, 10), wp(139.002, 35, 50, 10)]
    const [phase] = buildFlightPhases(wps)
    expect(phase.type).toBe('fly')
    if (phase.type === 'fly') {
      expect(phase.durationMs).toBeCloseTo((phase.lengthM / 10) * 1000, 3)
    }
  })

  it('直線セグメントの弧長は直線距離とほぼ一致する', () => {
    const a = wp(139, 35, 50, 10), b = wp(139.003, 35, 50, 10)
    const [phase] = buildFlightPhases([a, b])
    if (phase.type === 'fly') {
      expect(phase.lengthM).toBeCloseTo(distM(a, b), 0)
    }
  })
})

describe('sampleAtElapsed — Waypoint通過精度', () => {
  it('各フライトフェーズ終端で対応WPを誤差1m未満で通過する', () => {
    const wps = sampleCourse()
    const phases = buildFlightPhases(wps)
    let cum = 0
    for (const ph of phases) {
      cum += ph.durationMs
      if (ph.type === 'fly') {
        const s = sampleAtElapsed(wps, phases, cum - 0.001)
        const target = wps[ph.segIdx + 1]
        expect(distM(s, target)).toBeLessThan(1)
        expect(s.altAGL).toBeCloseTo(target.altAGL, 1)
      }
    }
  })

  it('progress=0 は最初のWPを返す', () => {
    const wps = sampleCourse()
    const s = sampleAtElapsed(wps, buildFlightPhases(wps), 0)
    expect(distM(s, wps[0])).toBeLessThan(0.5)
  })

  it('総時間を超えた入力は最終WPに固定される', () => {
    const wps = sampleCourse()
    const phases = buildFlightPhases(wps)
    const s = sampleAtElapsed(wps, phases, totalFlightMs(phases) + 999999)
    expect(s.lon).toBe(wps[wps.length - 1].lon)
    expect(s.lat).toBe(wps[wps.length - 1].lat)
    expect(s.wpNumber).toBe(wps.length)
    expect(s.hovering).toBe(false)
  })
})

describe('sampleAtElapsed — 等速性', () => {
  it('カーブを含むフェーズでも設定速度の±5%以内で進む', () => {
    // 直角に曲がるコースでカーブ部の等速性を検証
    const wps = [
      wp(139.800, 35.700, 50, 6),
      wp(139.804, 35.700, 50, 6),
      wp(139.804, 35.704, 50, 6),
    ]
    const phases = buildFlightPhases(wps)
    const speeds: number[] = []
    let prev = sampleAtElapsed(wps, phases, 0)
    const step = 200
    for (let t = step; t <= phases[0].durationMs - step; t += step) {
      const s = sampleAtElapsed(wps, phases, t)
      speeds.push((distM(prev, s) / step) * 1000)
      prev = s
    }
    for (const sp of speeds) {
      expect(sp).toBeGreaterThan(6 * 0.9)
      expect(sp).toBeLessThan(6 * 1.1)
    }
  })
})

describe('sampleAtElapsed — ホバー', () => {
  it('ホバー中は位置・方位が静止し speed=0 を返す', () => {
    const wps = sampleCourse()
    const phases = buildFlightPhases(wps)
    const hoverStart = phases
      .slice(0, phases.findIndex((p) => p.type === 'hover'))
      .reduce((a, p) => a + p.durationMs, 0)
    const early = sampleAtElapsed(wps, phases, hoverStart + 500)
    const late = sampleAtElapsed(wps, phases, hoverStart + 9000)
    expect(early.lon).toBe(late.lon)
    expect(early.lat).toBe(late.lat)
    expect(early.heading).toBe(late.heading)
    expect(early.speedMS).toBe(0)
    expect(early.hovering).toBe(true)
  })
})

describe('splineSample — heading の cos(lat) 補正', () => {
  it('東西・南北で同じ角距離なら緯度補正で方位が正しく45°になる', () => {
    // 東京(lat≈35.7)で 同じ「度」の東進と北進：cos補正しないと東成分が過大評価される
    const lat = 35.7
    const dLat = 0.001
    const dLon = dLat / Math.cos((lat * Math.PI) / 180) // 同じメートル距離になる経度差
    const wps = [wp(139.8, lat, 50, 5), wp(139.8 + dLon, lat + dLat, 50, 5)]
    const s = splineSample(wps, 0, 0)
    // 実距離が東西=南北なので方位は北東45°付近になるべき
    expect(s.heading).toBeGreaterThan(40)
    expect(s.heading).toBeLessThan(50)
  })

  it('真東への移動は heading≈90°', () => {
    const wps = [wp(139.8, 35.7, 50, 5), wp(139.802, 35.7, 50, 5)]
    const s = splineSample(wps, 0, 0)
    expect(s.heading).toBeCloseTo(90, 0)
  })
})

describe('totalFlightDistanceM', () => {
  it('fly フェーズの弧長合計を返す（ホバーは距離0）', () => {
    const wps = sampleCourse()
    const phases = buildFlightPhases(wps)
    const sum = phases.filter((p) => p.type === 'fly')
      .reduce((a, p) => a + (p.type === 'fly' ? p.lengthM : 0), 0)
    expect(totalFlightDistanceM(phases)).toBeCloseTo(sum, 3)
  })
})

describe('退化入力への頑健性', () => {
  it('WPが2点だけでも例外なくサンプリングできる', () => {
    const wps = [wp(139.8, 35.7, 40, 5), wp(139.802, 35.702, 60, 5)]
    const phases = buildFlightPhases(wps)
    const mid = sampleAtElapsed(wps, phases, phases[0].durationMs / 2)
    expect(Number.isFinite(mid.lon)).toBe(true)
    expect(Number.isFinite(mid.lat)).toBe(true)
    expect(Number.isFinite(mid.heading)).toBe(true)
  })

  it('連続する同一座標WP（ゼロ長セグメント）でも NaN を出さない', () => {
    const wps = [wp(139.8, 35.7, 50, 5), wp(139.8, 35.7, 50, 5), wp(139.802, 35.702, 50, 5)]
    const phases = buildFlightPhases(wps)
    const total = totalFlightMs(phases)
    for (let t = 0; t <= total; t += total / 20) {
      const s = sampleAtElapsed(wps, phases, t)
      expect(Number.isFinite(s.lon)).toBe(true)
      expect(Number.isFinite(s.lat)).toBe(true)
      expect(Number.isFinite(s.altAGL)).toBe(true)
      expect(Number.isFinite(s.heading)).toBe(true)
    }
  })

  it('speedMS=0 でも totalMs が有限（Infinity で凍結しない）', () => {
    const wps = [wp(139.8, 35.7, 50, 0), wp(139.802, 35.702, 50, 0)]
    const phases = buildFlightPhases(wps)
    const total = totalFlightMs(phases)
    expect(Number.isFinite(total)).toBe(true)
    expect(total).toBeGreaterThan(0)
    const mid = sampleAtElapsed(wps, phases, total / 2)
    expect(Number.isFinite(mid.speedMS)).toBe(true)
    expect(mid.speedMS).toBeGreaterThan(0) // 下限速度にクランプされる
  })

  it('speedMS が負・NaN でも有限の所要時間になる', () => {
    for (const bad of [-5, NaN]) {
      const wps = [wp(139.8, 35.7, 50, bad), wp(139.803, 35.703, 50, bad)]
      const total = totalFlightMs(buildFlightPhases(wps))
      expect(Number.isFinite(total)).toBe(true)
      expect(total).toBeGreaterThan(0)
    }
  })
})

describe('splineSample — 飛行ピッチ角（POVカメラ姿勢追従用）', () => {
  it('上昇セグメント中間で正のピッチ、下降で負のピッチを返す', () => {
    const climb = [wp(139.80, 35.70, 30, 5), wp(139.802, 35.702, 90, 5)]
    const descend = [wp(139.80, 35.70, 90, 5), wp(139.802, 35.702, 30, 5)]
    expect(splineSample(climb, 0, 0.5).pitchDeg).toBeGreaterThan(3)
    expect(splineSample(descend, 0, 0.5).pitchDeg).toBeLessThan(-3)
  })

  it('水平飛行ではピッチ ≈ 0', () => {
    const level = [wp(139.80, 35.70, 50, 5), wp(139.802, 35.702, 50, 5)]
    expect(Math.abs(splineSample(level, 0, 0.5).pitchDeg)).toBeLessThan(0.5)
  })

  it('ホバー・終端サンプルのピッチは0', () => {
    const wps = sampleCourse()
    const phases = buildFlightPhases(wps)
    const total = totalFlightMs(phases)
    expect(sampleAtElapsed(wps, phases, total + 1000).pitchDeg).toBe(0)
  })
})

describe('ルート描画とスプライン飛行の一致（WPからの逸脱ゼロ）', () => {
  it('スプラインサンプルは各WPで厳密に一致する（描画線が飛行軌跡と同一）', () => {
    const wps = sampleCourse()
    for (let i = 0; i < wps.length - 1; i++) {
      const s0 = splineSample(wps, i, 0)
      const s1 = splineSample(wps, i, 1)
      expect(s0.lon).toBeCloseTo(wps[i].lon, 9)
      expect(s0.lat).toBeCloseTo(wps[i].lat, 9)
      expect(s1.lon).toBeCloseTo(wps[i + 1].lon, 9)
      expect(s1.lat).toBeCloseTo(wps[i + 1].lat, 9)
    }
  })
})

describe('computeFlightStats', () => {
  it('WPが2点未満なら null', () => {
    expect(computeFlightStats([])).toBeNull()
    expect(computeFlightStats([wp(139.8, 35.7, 50, 5)])).toBeNull()
  })

  it('距離・時間・最大高度・撮影数を返す', () => {
    const wps = sampleCourse()
    const stats = computeFlightStats(wps)!
    expect(stats).not.toBeNull()
    expect(stats.maxAlt).toBe(100)
    // sampleCourse は photo x2（video_start は無し）
    expect(stats.photoCount).toBe(2)
    // 距離・時間はフェーズ由来と一致
    const phases = buildFlightPhases(wps)
    expect(stats.distM).toBeCloseTo(totalFlightDistanceM(phases), 3)
    expect(stats.totalMs).toBeCloseTo(totalFlightMs(phases), 3)
  })

  it('撮影ポイントは photo と video_start を数える', () => {
    const wps = [
      wp(139.80, 35.70, 40, 5, { action: 'photo' }),
      wp(139.802, 35.702, 40, 5, { action: 'video_start' }),
      wp(139.804, 35.704, 40, 5, { action: 'hover', hoverSec: 3 }),
      wp(139.806, 35.706, 40, 5),
    ]
    expect(computeFlightStats(wps)!.photoCount).toBe(2)
  })
})
