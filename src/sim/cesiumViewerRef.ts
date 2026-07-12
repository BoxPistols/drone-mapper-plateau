import type { Viewer } from 'cesium'

// Cesium Viewer をコンポーネント外（store など）から参照するための共有ハンドル。
// CesiumMap が生成時に current を設定・破棄時に null にする。
// CesiumMap ↔ store の循環 import を避けるため、あえて独立したリーフモジュールに置く。
export const cesiumViewerRef: { current: Viewer | null } = { current: null }
