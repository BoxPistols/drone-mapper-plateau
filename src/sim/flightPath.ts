// フライトフェーズ構築 + スプライン上の位置サンプリング（SimEngine チーム）
//
// 従来は SimPlayer(tick/seek/HUD)・droneStore(startSimulation) の4箇所に
// 距離・フェーズ計算が重複コピーされ、HUD だけセグメント等分割（禁止パターン）だった。
// 本モジュールに一本化し、全箇所が同一のフェーズ定義・所要時間を共有する。
import { catmullRom, catmullRomTangent, mirrorPoint } from './spline'
import type { Waypoint } from '../types'

// 弧長テーブルの分割数。スプライン曲線長と時間→位置変換の精度を決める
const ARC_SAMPLES = 32

// 速度の下限 (m/s)。UIで速度フィールドを空にすると Number('')===0 になり、
// lengthM/0 = Infinity で totalMs が発散→進捗が常に0でシミュが凍結する。
// NaN・負値も含めて安全な正の値にクランプする。
const MIN_SPEED_MS = 0.1

function safeSpeed(speedMS: number): number {
  return Number.isFinite(speedMS) && speedMS >= MIN_SPEED_MS ? speedMS : MIN_SPEED_MS
}

export type FlightPhase =
  | { type: 'fly'; segIdx: number; durationMs: number; lengthM: number; cumLenM: number[] }
  | { type: 'hover'; wpIdx: number; durationMs: number }

export interface FlightSample {
  lon: number
  lat: number
  altAGL: number
  /** 機首方位 deg（北=0, 時計回り） */
  heading: number
  /** 現在の対地速度 m/s（ホバー中・終端は0） */
  speedMS: number
  /** 現在向かっている（ホバー中は滞在中の）WP番号 1-based */
  wpNumber: number
  hovering: boolean
}

interface LonLatAlt { lon: number; lat: number; altAGL: number }

// 経度差は緯度で縮むため cos(lat) 補正して3次元距離をメートルで返す
function distMeters(a: LonLatAlt, b: LonLatAlt): number {
  const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
  const dy = (b.lat - a.lat) * 110540
  const dz = b.altAGL - a.altAGL
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// セグメント segIdx の Catmull-Rom 制御点4つ（端点はミラーで補う）
function controlPoints(wps: Waypoint[], segIdx: number) {
  const p0 = segIdx > 0 ? wps[segIdx - 1] : mirrorPoint(wps[segIdx], wps[segIdx + 1])
  const p1 = wps[segIdx]
  const p2 = wps[segIdx + 1]
  const p3 = segIdx + 2 < wps.length ? wps[segIdx + 2] : mirrorPoint(wps[segIdx + 1], wps[segIdx])
  return [p0, p1, p2, p3] as const
}

/** スプラインパラメータ t での位置と機首方位（方位は経度成分を cos(lat) 補正） */
export function splineSample(wps: Waypoint[], segIdx: number, t: number) {
  const [p0, p1, p2, p3] = controlPoints(wps, segIdx)
  const pt = catmullRom(p0, p1, p2, p3, t)
  const tan = catmullRomTangent(p0, p1, p2, p3, t)
  const heading = Math.atan2(tan.lon * Math.cos((pt.lat * Math.PI) / 180), tan.lat) * (180 / Math.PI)
  return { lon: pt.lon, lat: pt.lat, altAGL: pt.altAGL, heading }
}

/**
 * 飛行フェーズ列を構築する。
 * fly フェーズの所要時間は「スプライン曲線の弧長 ÷ 出発WPの速度」。
 * 直線距離ではなく弧長を使うことで、カーブでも設定速度どおりに飛ぶ。
 */
export function buildFlightPhases(wps: Waypoint[]): FlightPhase[] {
  const phases: FlightPhase[] = []
  for (let i = 0; i < wps.length - 1; i++) {
    const cumLenM: number[] = [0]
    let prev = splineSample(wps, i, 0)
    for (let s = 1; s <= ARC_SAMPLES; s++) {
      const cur = splineSample(wps, i, s / ARC_SAMPLES)
      cumLenM.push(cumLenM[s - 1] + distMeters(prev, cur))
      prev = cur
    }
    const lengthM = cumLenM[ARC_SAMPLES]
    phases.push({
      type: 'fly', segIdx: i, lengthM, cumLenM,
      durationMs: Math.max((lengthM / safeSpeed(wps[i].speedMS)) * 1000, 1),
    })
    // 最終WPのホバーは意味がないので除外
    const b = wps[i + 1]
    if (b.action === 'hover' && b.hoverSec && i < wps.length - 2) {
      phases.push({ type: 'hover', wpIdx: i + 1, durationMs: b.hoverSec * 1000 })
    }
  }
  return phases
}

export function totalFlightMs(phases: FlightPhase[]): number {
  return phases.reduce((sum, p) => sum + p.durationMs, 0)
}

export function totalFlightDistanceM(phases: FlightPhase[]): number {
  return phases.reduce((sum, p) => sum + (p.type === 'fly' ? p.lengthM : 0), 0)
}

export interface FlightStats {
  /** 総飛行距離 m（スプライン弧長） */
  distM: number
  /** 総所要時間 ms（速度=1x, ホバー含む） */
  totalMs: number
  /** 最大高度 m AGL */
  maxAlt: number
  /** 撮影ポイント数（写真・動画開始） */
  photoCount: number
}

/**
 * 飛行統計を1箇所で算出する（統計は PlansPanel・MissionComplete で共有）。
 * 距離は弧長・時間はフェーズ合計。撮影ポイントの定義もここで一意に決める。
 */
export function computeFlightStats(wps: Waypoint[]): FlightStats | null {
  if (wps.length < 2) return null
  const phases = buildFlightPhases(wps)
  let maxAlt = 0
  let photoCount = 0
  for (const wp of wps) {
    if (wp.altAGL > maxAlt) maxAlt = wp.altAGL
    if (wp.action === 'photo' || wp.action === 'video_start') photoCount++
  }
  return {
    distM: totalFlightDistanceM(phases),
    totalMs: totalFlightMs(phases),
    maxAlt,
    photoCount,
  }
}

// 弧長 dist に対応するスプラインパラメータ t を累積長テーブルから逆引き
function tForDistance(cumLenM: number[], dist: number): number {
  const n = cumLenM.length - 1
  const total = cumLenM[n]
  if (total <= 0) return 0
  const d = Math.min(Math.max(dist, 0), total)
  let i = 0
  while (i < n - 1 && cumLenM[i + 1] < d) i++
  const span = cumLenM[i + 1] - cumLenM[i]
  const f = span > 0 ? (d - cumLenM[i]) / span : 0
  return (i + f) / n
}

/**
 * 経過時間（実飛行ms）から機体の位置・方位・HUD表示値を求める。
 * tick・シーク・HUD がすべてこの1関数を使うことで表示と実位置のズレを防ぐ。
 */
export function sampleAtElapsed(wps: Waypoint[], phases: FlightPhase[], elapsedMs: number): FlightSample {
  let cumMs = 0
  for (const phase of phases) {
    if (elapsedMs < cumMs + phase.durationMs) {
      const frac = Math.min((elapsedMs - cumMs) / phase.durationMs, 1)
      if (phase.type === 'fly') {
        // 時間割合 → 移動距離 → 弧長テーブルで t に変換（曲線上でも等速）
        const t = tForDistance(phase.cumLenM, frac * phase.lengthM)
        const s = splineSample(wps, phase.segIdx, t)
        return { ...s, speedMS: safeSpeed(wps[phase.segIdx].speedMS), wpNumber: phase.segIdx + 2, hovering: false }
      }
      // ホバー: WPに静止。方位は直前セグメント終端の進行方向で確定（シーク後も安定）
      const wp = wps[phase.wpIdx]
      const { heading } = splineSample(wps, phase.wpIdx - 1, 1)
      return { lon: wp.lon, lat: wp.lat, altAGL: wp.altAGL, heading, speedMS: 0, wpNumber: phase.wpIdx + 1, hovering: true }
    }
    cumMs += phase.durationMs
  }
  // 終端: 最終WPに固定
  const last = wps[wps.length - 1]
  const { heading } = splineSample(wps, wps.length - 2, 1)
  return { lon: last.lon, lat: last.lat, altAGL: last.altAGL, heading, speedMS: 0, wpNumber: wps.length, hovering: false }
}
