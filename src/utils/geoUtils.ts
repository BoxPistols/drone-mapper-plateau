// レイキャスティング法による点のポリゴン内判定
export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function mToDegLon(m: number, lat: number): number {
  return m / (111320 * Math.cos((lat * Math.PI) / 180))
}
function mToDegLat(m: number): number {
  return m / 110540
}

function distanceM(a: [number, number], b: [number, number]): number {
  const dx = (b[0] - a[0]) * 111320 * Math.cos(((a[1] + b[1]) / 2 * Math.PI) / 180)
  const dy = (b[1] - a[1]) * 110540
  return Math.sqrt(dx * dx + dy * dy)
}

// ポリゴン外周を等間隔で分割
export function generatePerimeterPoints(coords: [number, number][], spacingM: number): [number, number][] {
  const points: [number, number][] = []
  const closed = [...coords, coords[0]]
  let accumulated = 0
  for (let i = 0; i < closed.length - 1; i++) {
    const a = closed[i], b = closed[i + 1]
    const edgeDist = distanceM(a, b)
    let pos = accumulated > 0 ? spacingM - accumulated : 0
    while (pos <= edgeDist) {
      const t = pos / edgeDist
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      pos += spacingM
    }
    accumulated = edgeDist - (pos - spacingM)
  }
  return points
}

// ポリゴン内にグリッド状にポイント生成
export function generateGridPoints(coords: [number, number][], spacingM: number): [number, number][] {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const centerLat = (minLat + maxLat) / 2
  const dLon = mToDegLon(spacingM, centerLat)
  const dLat = mToDegLat(spacingM)
  const points: [number, number][] = []
  for (let lon = minLon; lon <= maxLon; lon += dLon) {
    for (let lat = minLat; lat <= maxLat; lat += dLat) {
      if (pointInPolygon([lon, lat], coords)) points.push([lon, lat])
    }
  }
  return points
}
