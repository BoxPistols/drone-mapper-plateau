// Catmull-Rom スプライン補間ユーティリティ

interface SplinePoint {
  lon: number
  lat: number
  altAGL: number
}

// 境界WPのミラーポイント（端点処理用）
export function mirrorPoint(anchor: SplinePoint, other: SplinePoint): SplinePoint {
  return {
    lon: 2 * anchor.lon - other.lon,
    lat: 2 * anchor.lat - other.lat,
    altAGL: anchor.altAGL,
  }
}

// Catmull-Rom 位置補間
export function catmullRom(p0: SplinePoint, p1: SplinePoint, p2: SplinePoint, p3: SplinePoint, t: number): SplinePoint {
  const t2 = t * t, t3 = t2 * t
  return {
    lon: 0.5 * ((2 * p1.lon) + (-p0.lon + p2.lon) * t + (2 * p0.lon - 5 * p1.lon + 4 * p2.lon - p3.lon) * t2 + (-p0.lon + 3 * p1.lon - 3 * p2.lon + p3.lon) * t3),
    lat: 0.5 * ((2 * p1.lat) + (-p0.lat + p2.lat) * t + (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 + (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3),
    altAGL: Math.max(0, 0.5 * ((2 * p1.altAGL) + (-p0.altAGL + p2.altAGL) * t + (2 * p0.altAGL - 5 * p1.altAGL + 4 * p2.altAGL - p3.altAGL) * t2 + (-p0.altAGL + 3 * p1.altAGL - 3 * p2.altAGL + p3.altAGL) * t3)),
  }
}

// Catmull-Rom 接線ベクトル（heading算出用）
export function catmullRomTangent(p0: SplinePoint, p1: SplinePoint, p2: SplinePoint, p3: SplinePoint, t: number): { lon: number; lat: number } {
  const t2 = t * t
  return {
    lon: 0.5 * ((-p0.lon + p2.lon) + (4 * p0.lon - 10 * p1.lon + 8 * p2.lon - 2 * p3.lon) * t + (-3 * p0.lon + 9 * p1.lon - 9 * p2.lon + 3 * p3.lon) * t2),
    lat: 0.5 * ((-p0.lat + p2.lat) + (4 * p0.lat - 10 * p1.lat + 8 * p2.lat - 2 * p3.lat) * t + (-3 * p0.lat + 9 * p1.lat - 9 * p2.lat + 3 * p3.lat) * t2),
  }
}
